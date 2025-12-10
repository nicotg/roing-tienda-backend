import Order from '../models/order-model'; 
import OrderLine from '../models/order-line-model';
import ProductSize from '../models/size-product-model'; // Importamos el modelo de talles
import Status from '../models/status-model';
import db from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

// Agregamos checkoutData como tercer argumento
export const createOrder = async (items: any[], userId: number, checkoutData: any) => {
    const t = await db.transaction();

    try {
        // 0. VALIDACIÓN DE STOCK PREVIA
        // Antes de crear nada, verificamos que haya stock suficiente para todos los items
        for (const item of items) {
            const productSize = await ProductSize.findOne({
                where: {
                    idProduct: item.id,
                    idSize: item.sizeId || 1 // Asegúrate de que item.sizeId venga del front
                },
                transaction: t
            });

            if (!productSize) {
                throw new Error(`El producto ${item.title} no tiene talle asignado.`);
            }

            if (productSize.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.title}. Disponible: ${productSize.stock}`);
            }
        }

        const external_reference = uuidv4();

        // 1. Calcular el total
        const total = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

        // 2. Crear la Orden (Cabecera)
        const newOrder = await Order.create({
            idUser: userId,
            orderDate: new Date(),
            total_amount: total, 
            statusMp: 'pending', 
            external_reference: external_reference,
            customer_name: checkoutData.name, 
            customer_email: checkoutData.email,
            customer_phone: checkoutData.phone,
            customer_notes: checkoutData.notes,
            idPaymentMethod: 1 
        }, { transaction: t });

        
        // 3. Preparar y Crear las OrderLines (Detalle)
        const lines = items.map(item => ({
            idOrder: newOrder.getDataValue('idOrder'),
            idProduct: item.id,
            idSize: item.sizeId || 1,
            quantity: item.quantity,
            subtotal: item.unit_price * item.quantity
        }));

        await OrderLine.bulkCreate(lines, { transaction: t });

        // 4. Crear status inicial según order.statusMp
        const statusDesc = (newOrder.getDataValue('statusMp') === 'approved') ? 'confirmed' : 'pending-payment';
        await Status.create({
            idOrder: newOrder.getDataValue('idOrder'),
            statusDate: new Date(),
            description: statusDesc,
        }, { transaction: t });

        // Confirmar transacción
        await t.commit();

        // Retornamos la external_reference para enviarla a Mercado Pago
        return external_reference;

    } catch (error) {
        await t.rollback();
        throw error;
    }
};

// Agregamos paymentId como parámetro opcional
export const updateOrderStatus = async (externalReference: string, status: string, paymentId?: string) => {
    const t = await db.transaction();
    
    try {
        // 1. Idempotencia: Verificar estado actual
        const currentOrder = await Order.findOne({ 
            where: { external_reference: externalReference },
            transaction: t 
        });

        if (!currentOrder || currentOrder.statusMp === 'approved') {
            await t.commit();
            return;
        }

        // 2. Actualizar estado y payment_id
        await Order.update({ 
            statusMp: status,
            payment_id: paymentId 
        }, {
            where: { external_reference: externalReference },
            transaction: t
        });

        // 3. Si es aprobado, descontar stock
        if (status === 'approved') {
            const lines = await OrderLine.findAll({ 
                where: { idOrder: currentOrder.idOrder },
                transaction: t
            });

            for (const line of lines) {
                await ProductSize.decrement('stock', { 
                    by: line.quantity,
                    where: { 
                        idProduct: line.idProduct,
                        idSize: line.idSize 
                    },
                    transaction: t
                });
            }
        }
            
        await t.commit();
    } catch (error) {
        await t.rollback();
        console.error("Error actualizando orden y stock:", error);
        throw error;
    }
};