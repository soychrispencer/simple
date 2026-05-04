import crypto from 'node:crypto';

const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

type MercadoPagoRequestOptions = {
    method: 'GET' | 'POST';
    body?: unknown;
    idempotencyKey?: string;
};

type MercadoPagoPreferenceResponse = {
    id: string;
    init_point?: string | null;
    sandbox_init_point?: string | null;
};

type MercadoPagoPreapprovalResponse = {
    id: string;
    init_point?: string | null;
    status?: string | null;
};

type MercadoPagoPaymentResponse = Record<string, unknown>;
type MercadoPagoSubscriptionResponse = Record<string, unknown>;

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getAccessToken(): string {
    return asString(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

function getHeaders(idempotencyKey?: string): HeadersInit {
    const accessToken = getAccessToken();
    if (!accessToken) {
        throw new Error('Mercado Pago no está configurado. Falta MERCADO_PAGO_ACCESS_TOKEN.');
    }

    return {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    };
}

function extractErrorMessage(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object') {
        const asRecord = payload as Record<string, unknown>;
        const cause = Array.isArray(asRecord.cause) ? asRecord.cause[0] : null;
        if (cause && typeof cause === 'object') {
            const description = asString((cause as Record<string, unknown>).description);
            if (description) return description;
        }

        const message = asString(asRecord.message) || asString(asRecord.error);
        if (message) return message;
    }

    return `Mercado Pago respondió con estado ${status}.`;
}

async function requestMercadoPago<T>(path: string, options: MercadoPagoRequestOptions): Promise<T> {
    const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
        method: options.method,
        headers: getHeaders(options.idempotencyKey),
        body: options.body == null ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(extractErrorMessage(payload, response.status));
    }

    return payload as T;
}

export function isMercadoPagoConfigured(): boolean {
    return getAccessToken().length > 0;
}

export async function createCheckoutPreference(input: {
    externalReference: string;
    title: string;
    description?: string;
    amount: number;
    currencyId: string;
    payerEmail: string;
    payerName?: string;
    backUrls: {
        success: string;
        failure: string;
        pending: string;
    };
    metadata?: Record<string, unknown>;
    accessToken?: string; // professional's own MP token
    /** URL que Mercado Pago notifica cuando cambia el estado del pago (IPN). Debe ser HTTPS en producción. */
    notificationUrl?: string;
}): Promise<{ id: string; initPoint: string | null; sandboxInitPoint: string | null }> {
    const idempotencyKey = input.externalReference;
    const headers: HeadersInit = input.accessToken
        ? { Accept: 'application/json', Authorization: `Bearer ${input.accessToken}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) }
        : getHeaders(idempotencyKey);

    const response = await fetch(`${MERCADO_PAGO_API_BASE}/checkout/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            items: [
                {
                    title: input.title,
                    description: input.description ?? input.title,
                    quantity: 1,
                    currency_id: input.currencyId,
                    unit_price: input.amount,
                },
            ],
            payer: {
                email: input.payerEmail,
                name: input.payerName,
            },
            back_urls: input.backUrls,
            auto_return: 'approved',
            external_reference: input.externalReference,
            metadata: input.metadata ?? {},
            ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        }),
    });

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(extractErrorMessage(responsePayload, response.status));
    }
    const payload = responsePayload as MercadoPagoPreferenceResponse;

    return {
        id: payload.id,
        initPoint: payload.init_point ?? null,
        sandboxInitPoint: payload.sandbox_init_point ?? null,
    };
}

export async function getPaymentById(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    return requestMercadoPago<MercadoPagoPaymentResponse>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
    });
}

export async function createPreapproval(input: {
    externalReference: string;
    reason: string;
    amount: number;
    currencyId: string;
    payerEmail: string;
    backUrl: string;
}): Promise<{ id: string; initPoint: string | null; status: string | null }> {
    const payload = await requestMercadoPago<MercadoPagoPreapprovalResponse>('/preapproval', {
        method: 'POST',
        idempotencyKey: input.externalReference,
        body: {
            reason: input.reason,
            external_reference: input.externalReference,
            payer_email: input.payerEmail,
            back_url: input.backUrl,
            status: 'pending',
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: input.amount,
                currency_id: input.currencyId,
            },
        },
    });

    return {
        id: payload.id,
        initPoint: payload.init_point ?? null,
        status: payload.status ?? null,
    };
}

export async function getPreapprovalById(preapprovalId: string): Promise<MercadoPagoSubscriptionResponse> {
    return requestMercadoPago<MercadoPagoSubscriptionResponse>(`/preapproval/${encodeURIComponent(preapprovalId)}`, {
        method: 'GET',
    });
}

/**
 * Reembolsa un pago de Mercado Pago.
 * - Sin `amount` → reembolso total.
 * - Con `amount` → reembolso parcial (en la misma moneda del pago).
 * Idempotente: MP soporta `X-Idempotency-Key`.
 */
export async function refundPayment(input: {
    paymentId: string;
    amount?: number;
    idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> | undefined =
        typeof input.amount === 'number' ? { amount: input.amount } : undefined;
    return requestMercadoPago<Record<string, unknown>>(
        `/v1/payments/${encodeURIComponent(input.paymentId)}/refunds`,
        {
            method: 'POST',
            idempotencyKey: input.idempotencyKey ?? `refund:${input.paymentId}`,
            body: body as unknown,
        }
    );
}

/**
 * Verifica la firma del webhook de Mercado Pago.
 *
 * Documentación: https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
 *
 * El header `x-signature` viene como `ts=1700000000,v1=<sha256hex>`. La firma se calcula como:
 *
 *   manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
 *   v1 = HMAC_SHA256(secret, manifest)
 *
 * - `secret` = `MERCADO_PAGO_WEBHOOK_SECRET`
 * - `dataId` = id del recurso recibido (query `data.id` o body.data.id)
 * - `requestId` = header `x-request-id`
 *
 * Si el secret no está configurado, devuelve `'unsigned'` (no aborta — la verificación
 * con `getPaymentById` ya cubre el caso). Si está configurado y la firma no coincide,
 * devuelve `false`.
 */
export function verifyMercadoPagoWebhookSignature(input: {
    xSignature: string | null | undefined;
    xRequestId: string | null | undefined;
    dataId: string | null | undefined;
}): true | false | 'unsigned' {
    const secret = asString(process.env.MERCADO_PAGO_WEBHOOK_SECRET);
    if (!secret) return 'unsigned';

    const sig = asString(input.xSignature);
    const reqId = asString(input.xRequestId);
    const dataId = asString(input.dataId);
    if (!sig || !reqId || !dataId) return false;

    const parts = sig.split(',').map((p) => p.trim());
    const partsMap = new Map<string, string>();
    for (const p of parts) {
        const i = p.indexOf('=');
        if (i <= 0) continue;
        partsMap.set(p.slice(0, i), p.slice(i + 1));
    }
    const ts = partsMap.get('ts');
    const v1 = partsMap.get('v1');
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    if (expected.length !== v1.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
    } catch {
        return false;
    }
}
