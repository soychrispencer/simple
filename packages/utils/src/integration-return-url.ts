export function buildIntegrationsReturnUrl(origin?: string): string {
    const base = (origin ?? (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    return `${base}/panel/mi-cuenta/integraciones#integraciones`;
}
