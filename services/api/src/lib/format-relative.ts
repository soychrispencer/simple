import type { BoostSection } from '../lib/domain-types.js';

export function formatAgo(timestamp: number): string {
    const deltaMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
    if (deltaMinutes < 60) return `${deltaMinutes}m`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours}h`;
    const deltaDays = Math.floor(deltaHours / 24);
    return `${deltaDays}d`;
}

export function formatRelativeTimestamp(timestamp: number): string {
    const deltaMinutes = Math.floor((timestamp - Date.now()) / (1000 * 60));
    if (deltaMinutes > 0) {
        if (deltaMinutes < 60) return `en ${deltaMinutes}m`;
        const deltaHours = Math.floor(deltaMinutes / 60);
        if (deltaHours < 24) return `en ${deltaHours}h`;
        const deltaDays = Math.floor(deltaHours / 24);
        return `en ${deltaDays}d`;
    }
    return formatAgo(timestamp);
}

export function publicSectionLabel(section: BoostSection): string {
    if (section === 'rent') return 'Arriendo';
    if (section === 'auction') return 'Subasta';
    if (section === 'project') return 'Proyecto';
    return 'Venta';
}
