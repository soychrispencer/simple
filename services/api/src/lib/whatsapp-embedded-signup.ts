const GRAPH_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || 'v27.0';

type GraphErrorBody = { error?: { code?: number; message?: string; type?: string } };
type GraphResponse<T> = T & GraphErrorBody;

export type WhatsAppPlatformConnectionStatus = {
    configured: boolean;
    remindersEnabled: boolean;
    connected: boolean;
    webhookConfigured: boolean;
    phoneNumber: string | null;
    verifiedName: string | null;
    accountMode: string | null;
    platformType: string | null;
    businessAppConnected: boolean | null;
    qualityRating: string | null;
    checkedAt: string | null;
    error: 'missing_configuration' | 'meta_unavailable' | null;
};

export type WhatsAppEmbeddedSignupResult = {
    subscribed: boolean;
    connection: WhatsAppPlatformConnectionStatus;
};

export class WhatsAppEmbeddedSignupError extends Error {
    constructor(
        message: string,
        readonly code: 'MISSING_CONFIGURATION' | 'ASSET_MISMATCH' | 'CODE_EXCHANGE_FAILED' | 'ASSET_ACCESS_FAILED' | 'SUBSCRIPTION_FAILED',
        readonly status = 400,
    ) {
        super(message);
        this.name = 'WhatsAppEmbeddedSignupError';
    }
}

function configuredMetaAssets() {
    return {
        token: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID_AGENDA?.trim()
            || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
            || process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()
            || '',
        wabaId: process.env.WHATSAPP_WABA_ID_AGENDA?.trim() || process.env.WHATSAPP_WABA_ID?.trim() || '',
        appId: process.env.WHATSAPP_APP_ID_AGENDA?.trim() || process.env.META_APP_ID?.trim() || process.env.INSTAGRAM_APP_ID?.trim() || '',
        appSecret: process.env.WHATSAPP_APP_SECRET_AGENDA?.trim()
            || process.env.META_APP_SECRET_AGENDA?.trim()
            || process.env.WHATSAPP_APP_SECRET?.trim()
            || process.env.INSTAGRAM_APP_SECRET?.trim()
            || '',
    };
}

async function graphRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as GraphResponse<T>;
    if (!response.ok || body.error) {
        const message = typeof body.error?.message === 'string' ? body.error.message : 'Meta Graph API error';
        const error = new Error(message) as Error & { status?: number; graphCode?: number };
        error.status = response.status;
        error.graphCode = body.error?.code;
        throw error;
    }
    return body;
}

type MetaPhoneStatus = {
    id?: string;
    display_phone_number?: string;
    verified_name?: string;
    account_mode?: string;
    platform_type?: string;
    is_on_biz_app?: boolean;
    quality_rating?: string;
};

export async function getWhatsAppPlatformConnectionStatus(): Promise<WhatsAppPlatformConnectionStatus> {
    const config = configuredMetaAssets();
    const configured = Boolean(config.token && config.phoneNumberId && config.wabaId);
    const webhookConfigured = Boolean(
        (process.env.WHATSAPP_VERIFY_TOKEN_AGENDA?.trim() || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN_AGENDA?.trim())
        && (process.env.WHATSAPP_APP_SECRET_AGENDA?.trim()
            || process.env.META_APP_SECRET_AGENDA?.trim()
            || process.env.WHATSAPP_APP_SECRET?.trim()
            || process.env.INSTAGRAM_APP_SECRET?.trim()),
    );
    const remindersEnabled = process.env.WHATSAPP_AGENDA_ENABLED?.trim().toLowerCase() === 'true';

    const base: WhatsAppPlatformConnectionStatus = {
        configured,
        remindersEnabled,
        connected: false,
        webhookConfigured,
        phoneNumber: null,
        verifiedName: null,
        accountMode: null,
        platformType: null,
        businessAppConnected: null,
        qualityRating: null,
        checkedAt: null,
        error: configured ? null : 'missing_configuration',
    };
    if (!configured) return base;

    try {
        const phone = await graphRequest<MetaPhoneStatus>(
            `${encodeURIComponent(config.phoneNumberId)}?fields=id,display_phone_number,verified_name,account_mode,platform_type,is_on_biz_app,quality_rating`,
            config.token,
        );
        const businessAppConnected = typeof phone.is_on_biz_app === 'boolean' ? phone.is_on_biz_app : null;
        const platformType = typeof phone.platform_type === 'string' ? phone.platform_type : null;
        return {
            ...base,
            connected: phone.id === config.phoneNumberId
                && phone.account_mode === 'LIVE'
                && (platformType === 'CLOUD_API' || businessAppConnected === true),
            phoneNumber: phone.display_phone_number ?? null,
            verifiedName: phone.verified_name ?? null,
            accountMode: phone.account_mode ?? null,
            platformType,
            businessAppConnected,
            qualityRating: phone.quality_rating ?? null,
            checkedAt: new Date().toISOString(),
            error: null,
        };
    } catch {
        return { ...base, error: 'meta_unavailable', checkedAt: new Date().toISOString() };
    }
}

export async function completeWhatsAppEmbeddedSignup(input: {
    code: string;
    wabaId: string;
    phoneNumberId?: string;
}): Promise<WhatsAppEmbeddedSignupResult> {
    const config = configuredMetaAssets();
    if (!config.appId || !config.appSecret || !config.token || !config.wabaId || !config.phoneNumberId) {
        throw new WhatsAppEmbeddedSignupError('La conexión de WhatsApp de Simple no está configurada por completo.', 'MISSING_CONFIGURATION', 503);
    }
    if (input.wabaId !== config.wabaId || (input.phoneNumberId && input.phoneNumberId !== config.phoneNumberId)) {
        throw new WhatsAppEmbeddedSignupError('Meta devolvió una cuenta o un número distinto al configurado para SimpleAgenda.', 'ASSET_MISMATCH', 409);
    }

    const params = new URLSearchParams({
        client_id: config.appId,
        client_secret: config.appSecret,
        code: input.code,
    });
    let signupToken: string;
    try {
        const exchange = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params.toString()}`, {
            method: 'GET',
            signal: AbortSignal.timeout(15_000),
        });
        const payload = await exchange.json().catch(() => ({})) as { access_token?: string; error?: { message?: string } };
        if (!exchange.ok || !payload.access_token) {
            throw new Error(payload.error?.message || 'Token exchange failed');
        }
        signupToken = payload.access_token;
    } catch {
        throw new WhatsAppEmbeddedSignupError('Meta no pudo completar el intercambio seguro del código. Vuelve a iniciar el registro.', 'CODE_EXCHANGE_FAILED', 502);
    }

    try {
        const assets = await graphRequest<{ data?: Array<{ id?: string }> }>(
            `${encodeURIComponent(config.wabaId)}/phone_numbers?fields=id&limit=100`,
            signupToken,
        );
        if (!assets.data?.some((asset) => asset.id === config.phoneNumberId)) {
            throw new WhatsAppEmbeddedSignupError('La cuenta autorizada no incluye el número de SimplePlataforma.', 'ASSET_MISMATCH', 409);
        }
    } catch (error) {
        if (error instanceof WhatsAppEmbeddedSignupError) throw error;
        throw new WhatsAppEmbeddedSignupError('No se pudo validar el acceso de Meta a la cuenta de WhatsApp seleccionada.', 'ASSET_ACCESS_FAILED', 502);
    }

    try {
        await graphRequest<{ success?: boolean }>(
            `${encodeURIComponent(config.wabaId)}/subscribed_apps`,
            signupToken,
            { method: 'POST' },
        );
    } catch {
        throw new WhatsAppEmbeddedSignupError('La cuenta fue validada, pero Meta no completó la suscripción al webhook. Reintenta el alta.', 'SUBSCRIPTION_FAILED', 502);
    }

    return {
        subscribed: true,
        connection: await getWhatsAppPlatformConnectionStatus(),
    };
}
