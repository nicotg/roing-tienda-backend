// SDK de Mercado Pago
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createPreferenceService, getPaymentDataService } from '../services/payment-service';
import { createOrder, updateOrderStatus } from '../services/order-service';

export const createPreference = async (req: any, res: any) => {
    try {
        const { cartItems, storedUser, checkoutData } = req.body; // Asume que envías userId desde el front o lo sacas del token
        const frontendOrigin = req.headers?.origin || req.headers?.referer;

        // 1. Crear la orden completa (Header + Lines) en la DB
        // Pasamos un userId hardcodeado (1) si no viene en el body, ajusta según tu auth
        const orderId = await createOrder(cartItems, storedUser?.idUser || 1, checkoutData || {});

        // 2. Crea la preferencia pasando el ID de la orden real como referencia externa
        const result = await createPreferenceService(cartItems, orderId, frontendOrigin as string | undefined);

        res.status(200).json(result);

    } catch (error: any) {
        console.log(error);
        res.status(400).json({
            msg: error.message || 'Execution on payment preference creation failed'
        });
    }
}

export const receiveWebhook = async (req: any, res: any) => {
    try {
        
        const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id || req.body?.id;
        const type = req.query.type || req.query.topic || req.body?.type;

    

        if (type === 'payment' && paymentId) {
            
            const paymentDetails = await getPaymentDataService(paymentId);
            
            if (paymentDetails.external_reference && paymentDetails.status) {
                // Pasamos el ID del pago (convertido a string) como tercer argumento
                await updateOrderStatus(
                    paymentDetails.external_reference, 
                    paymentDetails.status, 
                    String(paymentDetails.id)
                );
                
                if (paymentDetails.status === 'approved') {
                    console.log(`Orden ${paymentDetails.external_reference} procesada y stock actualizado.`);
                }
            }
        }

        res.status(200).json({
            msg: 'Webhook received successfully'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error processing webhook. Please contact the administrator.'
        });
    }
}