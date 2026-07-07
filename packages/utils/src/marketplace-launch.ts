/** Verticals con período de lanzamiento (sin cobro de suscripción). */
export type PlatformLaunchVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

/** @deprecated Usa PlatformLaunchVertical */
export type MarketplaceLaunchVertical = 'autos' | 'propiedades';

/**
 * Modo lanzamiento: funciones sin límites de plan ni checkout de suscripción.
 * Desactivar con `MARKETPLACE_LAUNCH_MODE=false` (o `NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE=false`).
 */
export function isPlatformLaunchMode(): boolean {
    if (typeof process !== 'undefined') {
        const raw = process.env.MARKETPLACE_LAUNCH_MODE ?? process.env.NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE;
        if (raw === 'false' || raw === '0') return false;
    }
    return true;
}

/** @deprecated Usa isPlatformLaunchMode */
export const isMarketplaceLaunchMode = isPlatformLaunchMode;

export function isPlatformLaunchVertical(vertical: string): vertical is PlatformLaunchVertical {
    return vertical === 'autos'
        || vertical === 'propiedades'
        || vertical === 'agenda'
        || vertical === 'serenatas';
}

export function isPlatformLaunchActive(vertical: string): boolean {
    return isPlatformLaunchMode() && isPlatformLaunchVertical(vertical);
}

export function isMarketplaceLaunchVertical(vertical: string): vertical is MarketplaceLaunchVertical {
    return vertical === 'autos' || vertical === 'propiedades';
}

export function isMarketplaceLaunchActive(vertical: string): boolean {
    return isPlatformLaunchActive(vertical) && isMarketplaceLaunchVertical(vertical);
}

export const PLATFORM_LAUNCH_APP_LABELS: Record<PlatformLaunchVertical, string> = {
    autos: 'Simple Autos',
    propiedades: 'Simple Propiedades',
    agenda: 'Simple Agenda',
    serenatas: 'Simple Serenatas',
};
