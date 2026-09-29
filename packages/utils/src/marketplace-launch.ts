/** Verticals con período de lanzamiento (sin cobro de suscripción). */
export type PlatformLaunchVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';

/** @deprecated Usa PlatformLaunchVertical */
export type MarketplaceLaunchVertical = 'autos' | 'propiedades';

/**
 * Modo lanzamiento global (autos / propiedades / serenatas).
 * Desactivar con `MARKETPLACE_LAUNCH_MODE=false` (o `NEXT_PUBLIC_MARKETPLACE_LAUNCH_MODE=false`).
 *
 * Agenda **no** usa este flag por defecto: monetiza con trial 30d → Pro.
 * Solo vuelve a gratis de lanzamiento con `AGENDA_LAUNCH_MODE=true`.
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

/**
 * ¿La vertical está en lanzamiento sin cobro?
 * - agenda: cobro activo por defecto; opt-in con AGENDA_LAUNCH_MODE=true
 * - resto: MARKETPLACE_LAUNCH_MODE (default true)
 */
export function isPlatformLaunchActive(vertical: string): boolean {
    if (!isPlatformLaunchVertical(vertical)) return false;

    if (vertical === 'agenda') {
        if (typeof process === 'undefined') return false;
        const raw = process.env.AGENDA_LAUNCH_MODE ?? process.env.NEXT_PUBLIC_AGENDA_LAUNCH_MODE;
        return raw === 'true' || raw === '1';
    }

    return isPlatformLaunchMode();
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
