import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '' });

const normalizeBaseUrl = (rawUrl?: string) => {
    if (!rawUrl) {
        return 'http://localhost:5173';
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return 'http://localhost:5173';
    }

    try {
        // Normalize via WHATWG URL to ensure protocol is present
        const normalized = new URL(trimmed);
        return normalized.origin + normalized.pathname.replace(/\/+$/, '');
    } catch {
        return 'http://localhost:5173';
    }
};

const buildUrl = (path: string, base: string) => {
    try {
        return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
    } catch {
        return `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    }
};

export const createPreferenceService = async (items: any[], externalReference: string, frontendBaseUrl?: string) => {
    const preference = new Preference(client);

    const mpItems = items.map(item => ({
        id: String(item.id),
        title: item.name || item.title || "Producto",
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price ?? item.price ?? 0),
        currency_id: 'ARS'
    }));

    const frontendUrl = normalizeBaseUrl(frontendBaseUrl || process.env.FRONTEND_URL);
    const backendBase = normalizeBaseUrl(process.env.BACKEND_URL || 'http://localhost:3000');

    const successUrl = buildUrl('/checkout/success', frontendUrl);
    const failureUrl = buildUrl('/checkout/failure', frontendUrl);
    const pendingUrl = buildUrl('/checkout/pending', frontendUrl);
    const webhookUrl = buildUrl('/api/payments/webhook', backendBase);

    const shouldAutoReturn = successUrl.startsWith('https://');

    const result = await preference.create({
        body: {
            items: mpItems,
            external_reference: externalReference, 
            back_urls: {
                success: successUrl,
                failure: failureUrl,
                pending: pendingUrl
            },
            ...(shouldAutoReturn ? { auto_return: 'approved' as const } : {}),
            // Esta debe apuntar a tu BACKEND. 
            notification_url: webhookUrl
        }
    });

    return {
        id: result.id,
        init_point: result.init_point
    };
};

export const getPaymentDataService = async (id: string) => {
    const payment = new Payment(client);
    // Devuelve el objeto completo del pago (no solo el ID)
    return await payment.get({ id });
};
