import type { MercadoPagoOperatorVertical } from './oauth-state.js';

export type MercadoPagoOperatorTokens = {
    accessToken: string;
    publicKey: string | null;
    userId: string | null;
    refreshToken: string | null;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function getMercadoPagoOperatorAppCredentials() {
    const appId = asString(process.env.MP_OPERATOR_APP_ID) || asString(process.env.MP_AGENDA_APP_ID);
    const appSecret = asString(process.env.MP_OPERATOR_APP_SECRET) || asString(process.env.MP_AGENDA_APP_SECRET);
    return { appId, appSecret };
}

export function isMercadoPagoOperatorOAuthConfigured(): boolean {
    const { appId, appSecret } = getMercadoPagoOperatorAppCredentials();
    return Boolean(appId && appSecret);
}

export function getMercadoPagoOperatorOAuthCallbackUrl(): string {
    const configuredRedirectUri = asString(process.env.MP_OPERATOR_REDIRECT_URI);
    if (configuredRedirectUri) return configuredRedirectUri;

    const apiBase = asString(process.env.API_BASE_URL) || 'http://localhost:4000';
    return `${apiBase.replace(/\/$/, '')}/api/integrations/mercadopago/callback`;
}

export function getMercadoPagoOperatorAppOrigin(vertical: MercadoPagoOperatorVertical): string {
    if (vertical === 'agenda') {
        return asString(process.env.AGENDA_APP_URL) || 'http://localhost:3004';
    }
    if (vertical === 'autos') {
        return asString(process.env.AUTOS_APP_URL) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS) || 'http://localhost:3002';
    }
    if (vertical === 'propiedades') {
        return asString(process.env.PROPIEDADES_APP_URL) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES) || 'http://localhost:3003';
    }
    return asString(process.env.SERENATAS_APP_URL) || asString(process.env.MERCADO_PAGO_PUBLIC_ORIGIN_SERENATAS) || 'http://localhost:3005';
}

export function buildMercadoPagoOperatorAuthorizationUrl(state: string): string {
    const { appId } = getMercadoPagoOperatorAppCredentials();
    if (!appId) {
        throw new Error('MercadoPago OAuth no está configurado.');
    }
    const authorizationUrl = new URL('https://auth.mercadopago.cl/authorization');
    authorizationUrl.searchParams.set('client_id', appId);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('platform_id', 'mp');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('redirect_uri', getMercadoPagoOperatorOAuthCallbackUrl());
    return authorizationUrl.toString();
}

export async function exchangeMercadoPagoOperatorOAuthCode(code: string): Promise<MercadoPagoOperatorTokens> {
    const { appId, appSecret } = getMercadoPagoOperatorAppCredentials();
    if (!appId || !appSecret) {
        throw new Error('MercadoPago OAuth no está configurado.');
    }

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: getMercadoPagoOperatorOAuthCallbackUrl(),
        }),
    });

    if (!response.ok) {
        const providerError = await response.json().catch(() => null) as { error?: unknown } | null;
        const providerCode = asString(providerError?.error);
        const safeProviderCode = /^[a-z0-9_.-]{1,64}$/i.test(providerCode) ? providerCode : null;
        const diagnostic = safeProviderCode
            ? `${safeProviderCode}, HTTP ${response.status}`
            : `HTTP ${response.status}`;
        throw new Error(
            `No pudimos autorizar tu cuenta de Mercado Pago (${diagnostic}). Verifica que la aplicación OAuth y el callback registrado coincidan con la configuración de Simple.`,
        );
    }

    const tokens = await response.json() as {
        access_token?: string;
        public_key?: string;
        refresh_token?: string;
        user_id?: number | string;
    };

    const accessToken = asString(tokens.access_token);
    if (!accessToken) {
        throw new Error('MercadoPago no devolvió un token de acceso válido.');
    }

    return {
        accessToken,
        publicKey: asString(tokens.public_key) || null,
        userId: tokens.user_id != null ? String(tokens.user_id) : null,
        refreshToken: asString(tokens.refresh_token) || null,
    };
}
