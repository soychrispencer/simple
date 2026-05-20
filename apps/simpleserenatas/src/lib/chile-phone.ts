/** Valida teléfono móvil chileno (9 dígitos, prefijo 9). Acepta +56, espacios y guiones. */
export function validateChileMobilePhone(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) return null;
    const digits = trimmed.replace(/\D/g, '');
    const normalized = digits.startsWith('56') ? digits.slice(2) : digits;
    if (normalized.length !== 9 || normalized[0] !== '9') {
        return 'Usa un móvil chileno válido (ej: +56 9 1234 5678).';
    }
    return null;
}

export function formatChileMobileHint(): string {
    return '+56 9 XXXX XXXX';
}
