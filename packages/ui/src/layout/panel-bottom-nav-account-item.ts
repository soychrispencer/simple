import type { ComponentType, CSSProperties } from 'react';

/** Ruta estándar de cuenta en apps Simple con panel. */
export const PANEL_ACCOUNT_HREF = '/panel/mi-cuenta';

export const PANEL_ACCOUNT_LABEL = 'Mi cuenta';

export type PanelBottomNavAccountIcon = ComponentType<{
    size?: number;
    strokeWidth?: number;
    stroke?: number;
    style?: CSSProperties;
}>;

export function createPanelAccountNavItem(icon: PanelBottomNavAccountIcon) {
    return {
        href: PANEL_ACCOUNT_HREF,
        label: PANEL_ACCOUNT_LABEL,
        icon,
    } as const;
}
