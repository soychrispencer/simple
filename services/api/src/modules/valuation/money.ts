export function parseMoneyAmount(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return null;
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export function detectPriceCurrency(value: unknown): 'UF' | 'CLP' {
    return typeof value === 'string' && value.trim().toUpperCase().startsWith('UF') ? 'UF' : 'CLP';
}
