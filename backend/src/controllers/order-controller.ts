import Stripe from 'stripe';
import { Request, Response } from 'express';
import { Transaction, Op, Sequelize } from 'sequelize';
import { db } from '../db/connection';
import Order from '../models/order-model';
import OrderLine from '../models/order-line-model';
import Product from '../models/product-model';
import ProductSize from '../models/size-product-model';
import Size from '../models/size-model';
import Status from '../models/status-model';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Plain order shape used when serializing Sequelize instances for responses
type PlainOrder = {
    idOrder: number;
    orderDate: string | Date;
    PickupDate?: string | Date | null;
    idUser?: number;
    idPaymentMethod?: number;
    external_reference?: string;
    payment_id?: string;
    total_amount?: number | string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_notes?: string;
    sport?: string;
    statusMp?: string;
    currencyId?: string;
    orderLines?: any[];
    statusHistory?: any[];
    latestStatus?: {
        statusDate: string | Date;
        description: string;
    } | null;
    [key: string]: any;
};


export const createOrderFromSession = async (req: Request, res: Response) => {
    const { session_id } = req.body;

    if (!session_id) {
        return res.status(400).json({ msg: 'session_id es requerido' });
    }

    try {
        console.log(`🔍 Verificando sesión de Stripe: ${session_id}`);

        
        const session = await stripe.checkout.sessions.retrieve(session_id);

        console.log(`✅ Sesión recuperada: ${session.id}, status: ${session.payment_status}`);

        
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ 
                msg: 'El pago no ha sido completado',
                payment_status: session.payment_status 
            });
        }

        
        const existingOrder = await Order.findOne({
            where: { external_reference: session.id }
        });

        if (existingOrder) {
            console.log(`ℹ️ La orden ya existe: #${existingOrder.idOrder}`);
            return res.status(200).json({ 
                msg: 'La orden ya fue creada previamente',
                order: existingOrder 
            });
        }

        
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product'],
            limit: 100,
        });

        console.log(`📦 Items en la sesión: ${lineItems.data.length}`);

        
        const raw = session.metadata?.orderDetails;
        let orderDetailsParsed: any = {};
        if (raw) {
            try {
                orderDetailsParsed = JSON.parse(raw);
            } catch (e) {
                console.warn('orderDetails no es JSON válido:', e);
            }
        }

        
        const customerName = session.customer_details?.name || orderDetailsParsed?.customer_name || 'N/A';
        const customerEmail = session.customer_details?.email || orderDetailsParsed?.customer_email || 'no-reply@example.com';
        const customerPhone = session.customer_details?.phone || orderDetailsParsed?.phone || undefined;
        const customerNotes = orderDetailsParsed?.notes || undefined;
        
        
        const rawSport =
            orderDetailsParsed?.sport ??
            session.metadata?.sport ??
            undefined;
        const sport =
            typeof rawSport === 'string'
                ? rawSport.trim() || undefined
                : undefined;
        
        const paymentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

        
        const mapStripeToStatusMp = (sess: any) => {
            
            if (sess.payment_status === 'paid') return 'approved';
            if (sess.payment_status === 'unpaid') return 'pending';
            if (sess.payment_status === 'no_payment_required') return 'pending';

            const pi = typeof sess.payment_intent === 'object' ? sess.payment_intent : undefined;
            const piStatus = pi?.status;
            if (piStatus === 'succeeded') return 'approved';
            if (piStatus === 'processing') return 'in_process';
            if (piStatus === 'requires_payment_method' || piStatus === 'requires_action' || piStatus === 'requires_confirmation') return 'pending';
            if (piStatus === 'canceled' || piStatus === 'failed') return 'cancelled';

            
            return 'pending';
        };

    const detectedStatusMp = mapStripeToStatusMp(session as Stripe.Checkout.Session);

        
        let totalCents = 0;
        const parsedItems: Array<{ idProduct: number; idSize?: number; quantity: number; subtotalCents: number }> = [];

        for (const li of lineItems.data) {
            const qty = li.quantity ?? 1;
            const price = li.price!;
            const unitAmount = price.unit_amount ?? 0;
            const productObj = price.product as Stripe.Product;
            const idProductMeta = productObj?.metadata?.idProduct;
            const idSizeMeta = productObj?.metadata?.idSize;

            console.log(`📦 Line Item:`, {
                productName: productObj?.name,
                idProduct: idProductMeta,
                idSize: idSizeMeta,
                quantity: qty,
                metadata: productObj?.metadata
            });

            if (!idProductMeta) {
                throw new Error('Line item missing product metadata (idProduct)');
            }

            const subtotalCents = unitAmount * qty;
            totalCents += subtotalCents;

            parsedItems.push({
                idProduct: Number(idProductMeta),
                idSize: idSizeMeta ? Number(idSizeMeta) : undefined,
                quantity: qty,
                subtotalCents,
            });
        }

        

        
        let createdOrder: Order;

        await db.transaction(async (t: Transaction) => {
            const currency = (session.currency || 'usd').toUpperCase();

            
            createdOrder = await Order.create({
                orderDate: new Date(),
                idUser: Number(session.metadata?.userId || 0),
                idPaymentMethod: 1, 
                external_reference: session.id,
                payment_id: paymentId ?? undefined,
                total_amount: Number((totalCents / 100).toFixed(2)),
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                customer_notes: customerNotes,
                currencyId: currency,
                sport: sport,
                statusMp: detectedStatusMp, 
            }, { transaction: t });

            console.log(`✅ Orden #${createdOrder.idOrder} creada`);

            
            await Status.create({
                idOrder: createdOrder.idOrder,
                statusDate: new Date(),
                description: 'confirmed'
            }, { transaction: t });

            console.log(`📋 Status 'confirmado' creado para orden #${createdOrder.idOrder}`);

            
            for (const item of parsedItems) {
                const idSize = item.idSize ?? 7; // default size if not provided
                const ps = await ProductSize.findOne({
                    where: { idProduct: item.idProduct, idSize },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                if (!ps) {
                    throw new Error(`No existe talle ${idSize} para producto ${item.idProduct}`);
                }

                if (ps.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para producto ${item.idProduct} talle ${idSize}`);
                }

                ps.stock = ps.stock - item.quantity;
                await ps.save({ transaction: t });

                await OrderLine.create({
                    idOrder: createdOrder.idOrder,
                    idProduct: item.idProduct,
                    idSize,
                    quantity: item.quantity,
                    subtotal: Number((item.subtotalCents / 100).toFixed(2)),
                }, { transaction: t });

                console.log(`📦 Stock actualizado product=${item.idProduct} size=${idSize}: ${ps.stock}`);
            }
        });

        console.log(`🎉 Orden #${createdOrder!.idOrder} creada exitosamente`);

        return res.status(201).json({
            msg: 'Orden creada exitosamente',
            order: createdOrder!,
        });

    } catch (error: any) {
        console.error('❌ Error creating order from session:', error);
        return res.status(500).json({
            msg: 'Error al crear la orden',
            error: error.message,
        });
    }
};


export const getUserOrders = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ msg: 'userId es requerido' });
    }

    try {
        const orders = await Order.findAll({
            where: { idUser: Number(userId) },
            include: [
                {
                    model: OrderLine,
                    as: 'orderLines',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['idProduct', 'name'],
                            include: [
                                {
                                    model: (await import('../models/image-model')).default,
                                    as: 'images',
                                    attributes: ['url'],
                                },
                            ],
                        },
                        {
                            model: Size,
                            as: 'size',
                            attributes: ['idSize', 'sizeDesc'],
                        },
                    ],
                },
                {
                    model: Status,
                    as: 'statusHistory',
                    attributes: ['statusDate', 'description'],
                    order: [['statusDate', 'DESC']],
                    separate: true
                },
            ],
            order: [['orderDate', 'DESC']], // Más recientes primero
        });

        // Mapear las órdenes al formato que espera el frontend
        const mappedOrders = orders.map((order) => {
            const plainOrder = order.get({ plain: true }) as PlainOrder;
            
            // Mapear orderLines para incluir el nombre del talle
            if (plainOrder.orderLines) {
                plainOrder.orderLines = plainOrder.orderLines.map((line: any) => ({
                    ...line,
                    size: line.size?.sizeDesc || null,
                    product_name: line.product?.name || null,
                    product_image: (line.product?.images && line.product.images.length > 0) ? line.product.images[0].url : null,
                }));
            }

            // Agregar el último status de la orden
            if (plainOrder.statusHistory && plainOrder.statusHistory.length > 0) {
                plainOrder.latestStatus = plainOrder.statusHistory[0]; // El primero es el más reciente
            } else {
                plainOrder.latestStatus = null;
            }

            return plainOrder;
        });

        return res.status(200).json({ orders: mappedOrders });

    } catch (error: any) {
        console.error('❌ Error fetching user orders:', error);
        return res.status(500).json({
            msg: 'Error al obtener las órdenes',
            error: error.message,
        });
    }
};

/**
 * @desc    Obtiene órdenes paginadas (para admin)
 * @route   GET /api/orders
 */
export const getOrders = async (req: Request, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await Order.findAndCountAll({
            include: [
                {
                    model: OrderLine,
                    as: 'orderLines',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['idProduct', 'name'],
                            include: [
                                {
                                    model: (await import('../models/image-model')).default,
                                    as: 'images',
                                    attributes: ['url'],
                                },
                            ],
                        },
                        {
                            model: Size,
                            as: 'size',
                            attributes: ['idSize', 'sizeDesc'],
                        },
                    ],
                },
                {
                    model: Status,
                    as: 'statusHistory',
                    attributes: ['statusDate', 'description'],
                    order: [['statusDate', 'DESC']],
                    limit: 1, // Solo el más reciente
                },
            ],
            order: [['orderDate', 'DESC']],
            limit,
            offset,
        });

        const mappedOrders = rows.map((order) => {
            const plainOrder = order.get({ plain: true }) as PlainOrder;
            if (plainOrder.orderLines) {
                plainOrder.orderLines = plainOrder.orderLines.map((line: any) => ({
                    ...line,
                    size: line.size?.sizeDesc || null,
                    product_name: line.product?.name || null,
                    product_image: (line.product?.images && line.product.images.length > 0) ? line.product.images[0].url : null,
                }));
            }

            // Agregar el último status de la orden
            if (plainOrder.statusHistory && plainOrder.statusHistory.length > 0) {
                plainOrder.latestStatus = plainOrder.statusHistory[0]; // El primero es el más reciente
            } else {
                plainOrder.latestStatus = null;
            }

            return plainOrder;
        });

        const totalPages = Math.max(1, Math.ceil(count / limit));

        return res.status(200).json({
            orders: mappedOrders,
            total: count,
            page,
            totalPages,
        });
    } catch (error: any) {
        console.error('❌ Error fetching orders (admin):', error);
        return res.status(500).json({
            msg: 'Error al obtener las órdenes',
            error: error.message,
        });
    }
};

export const getMonthlyWorth = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1);

        const total = await Order.sum('total_amount', {
            where: {
                orderDate: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            }
        });

        const monthlyWorth = Number(total || 0);

        return res.status(200).json({
            total_monthly_worth: monthlyWorth,
            month: now.getMonth() + 1, // Mes actual (1-12)
        });

    } catch (error: any) {
        return res.status(500).json({
            msg: 'Error fetching monthly worth',
            error: error.message,
        });
    }
};

export const getSportsStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();

        const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const sportsStats = await Order.findAll({
            attributes: [
                'sport',
                [Order.sequelize!.fn('COUNT', Order.sequelize!.col('idOrder')), 'ordersCount']
            ],
            where: {
                orderDate: {
                    [Op.between]: [startDate, endDate]
                }
            },
            group: ['sport'],
            raw: true,
        });
        
        const filteredSportsStats = sportsStats.filter(stat => stat.sport !== null);
        
        return res.status(200).json({
            stats: filteredSportsStats
        });
    } catch (error: any) {
        return res.status(500).json({
            msg: 'Error fetching Orders by Sports',
            error: error.message,
        });
    }
};

export const getStatusStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

       
        const orders = await Order.findAll({
            where: {
                orderDate: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: Status,
                    as: 'statusHistory',
                    attributes: ['statusDate', 'description'],
                    order: [['statusDate', 'DESC']],
                    limit: 1 
                }
            ]
        });

        
        const statusCounts: { [key: string]: number } = {};
        
        orders.forEach(order => {
            const orderWithStatus = order as PlainOrder;
            const currentStatus = orderWithStatus.statusHistory && orderWithStatus.statusHistory.length > 0 
                ? orderWithStatus.statusHistory[0].description 
                : 'Sin estado';
            
            statusCounts[currentStatus] = (statusCounts[currentStatus] || 0) + 1;
        });

        
        const result = Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count
        }));

        return res.status(200).json({ stats: result });
    } catch (error: any) {
        return res.status(500).json({
            msg: 'Error fetching Orders by Status',
            error: error.message,
        });
    }
}

export const buttonOfRegret = async (req: Request, res: Response) => {
    try {
        const { idOrder } = req.params;
        if (!idOrder) {
            return res.status(400).json({ msg: 'idOrder es requerido' });
        }

        const order = await Order.findByPk(Number(idOrder));

        if (!order) {
            return res.status(404).json({ msg: 'Orden no encontrada' });
        }

        const orderDate = order.orderDate ? new Date(order.orderDate as any) : null;
        if (!orderDate) {
            return res.status(400).json({ msg: 'OrderDate inválida' });
        }

        const now = new Date();
        const msSinceOrder = now.getTime() - orderDate.getTime();
        const hoursSinceOrder = msSinceOrder / (1000 * 60 * 60);

        if (hoursSinceOrder > 24) {
            return res.status(400).json({ msg: 'No se puede cancelar: pasaron más de 24 horas desde la orden' });
        }

        // Obtener último status de la orden
        const latestStatus = await Status.findOne({
            where: { idOrder: Number(idOrder) },
            order: [['statusDate', 'DESC']],
        });

        if (!latestStatus) {
            return res.status(400).json({ msg: 'No se encontró estado para la orden' });
        }

        const desc = (latestStatus.description || '');
        if (desc !== 'ready' && desc !== 'confirmed') {
            return res.status(400).json({ msg: "Sólo se pueden cancelar órdenes con estado 'ready' o 'confirmed'" });
        }

        // Obtener las líneas de la orden
        const orderLines = await OrderLine.findAll({ where: { idOrder: Number(idOrder) } });

        if (!orderLines || orderLines.length === 0) {
            return res.status(400).json({ msg: 'La orden no tiene líneas' });
        }

        let createdStatus: any = null;

        await db.transaction(async (t: Transaction) => {
            // Crear status 'cancelled' vinculado a la orden
            createdStatus = await Status.create({
                idOrder: Number(idOrder),
                statusDate: new Date(),
                description: 'cancelled',
            }, { transaction: t });

            // Para cada order line, sumar la cantidad al stock correspondiente
            for (const line of orderLines) {
                const idSize = line.idSize ?? 7; 

                const ps = await ProductSize.findOne({
                    where: { idProduct: line.idProduct, idSize },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                if (!ps) {
                    throw new Error(`No existe product_size para product=${line.idProduct} size=${idSize}`);
                }

                ps.stock = (ps.stock || 0) + (line.quantity || 0);
                await ps.save({ transaction: t });
            }
        });

        return res.status(201).json({ msg: 'Orden cancelada correctamente', status: createdStatus });
    } catch (error) {
        console.error('Error en ButtonOfRegret:', error);
        return res.status(500).json({ msg: 'Error al procesar cancelación', error: (error as any).message || error });
    }
}