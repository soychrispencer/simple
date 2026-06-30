export type MercadoPagoOperatorVertical = 'agenda' | 'autos' | 'propiedades' | 'serenatas';

export function parseMercadoPagoOperatorVertical(raw: string | undefined): MercadoPagoOperatorVertical | null {
    if (raw === 'agenda' || raw === 'autos' || raw === 'propiedades' || raw === 'serenatas') {
        return raw;
    }
    return null;
}

export function makeMercadoPagoOAuthStatePayload(input: {
    nonce: string;
    userId: string;
    vertical: MercadoPagoOperatorVertical;
    returnTo: string;
}): string {
    return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function parseMercadoPagoOAuthStatePayload(value: string): {
    nonce: string;
    userId: string;
    vertical: MercadoPagoOperatorVertical;
    returnTo: string;
} | null {
    if (!value) return null;
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
        const nonce = typeof decoded.nonce === 'string' ? decoded.nonce.trim() : '';
        const userId = typeof decoded.userId === 'string' ? decoded.userId.trim() : '';
        const vertical = parseMercadoPagoOperatorVertical(
            typeof decoded.vertical === 'string' ? decoded.vertical : undefined,
        );
        const returnTo = typeof decoded.returnTo === 'string' ? decoded.returnTo.trim() : '';
        if (!nonce || !userId || !vertical || !returnTo) return null;
        return { nonce, userId, vertical, returnTo };
    } catch {
        return null;
    }
}
