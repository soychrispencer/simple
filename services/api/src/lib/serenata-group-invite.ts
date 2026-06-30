import { randomBytes } from 'node:crypto';

export function createGroupInviteToken(): string {
    return randomBytes(24).toString('base64url');
}

import { serenatasAppBaseUrl } from './url.js';

export function buildGroupInviteSignupUrl(token: string): string {
    const base = serenatasAppBaseUrl();
    const params = new URLSearchParams({ invite: token, perfil: 'musician' });
    return `${base}/?${params.toString()}`;
}

export function normalizeChileWhatsAppNumber(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    let normalized = digits.startsWith('56') ? digits.slice(2) : digits;
    if (normalized.length === 8 && normalized.startsWith('9')) normalized = `9${normalized}`;
    if (normalized.length !== 9 || normalized[0] !== '9') return null;
    return `56${normalized}`;
}

export function buildGroupInviteWhatsAppUrl(phone: string, message: string): string | null {
    const normalized = normalizeChileWhatsAppNumber(phone);
    if (!normalized) return null;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildGroupInviteWhatsAppMessage(input: {
    groupName: string;
    ownerName: string;
    signupUrl: string;
}): string {
    return [
        `Hola, ${input.ownerName} te invita al grupo "${input.groupName}" en Simple Serenatas.`,
        'Regístrate como músico aquí:',
        input.signupUrl,
    ].join('\n');
}
