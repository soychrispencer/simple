import type { CSSProperties } from 'react';

/** Altura y elevación compartidas del footer móvil. */
export const BOTTOM_NAV_BAR_CLASS = 'flex items-center justify-around h-14 px-1 sm:px-2';
export const BOTTOM_NAV_ITEM_CLASS = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5';
export const BOTTOM_NAV_ITEM_COMPACT_CLASS = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 px-0.5';
export const BOTTOM_NAV_LABEL_CLASS = 'max-w-[4.25rem] truncate text-xs font-medium';
export const BOTTOM_NAV_LABEL_COMPACT_CLASS = 'max-w-[3.25rem] truncate text-[10px] font-medium leading-tight';
export const BOTTOM_NAV_PRIMARY_LIFT_CLASS = '-mt-4';

export function bottomNavIsCompact(itemCount: number, hasMore: boolean): boolean {
    return itemCount + (hasMore ? 1 : 0) >= 5;
}

export const bottomNavShellClassName = 'fixed bottom-0 left-0 right-0 z-50 border-t';

export const bottomNavShellStyle: CSSProperties = {
    borderColor: 'var(--border)',
    background: 'color-mix(in oklab, var(--surface) 86%, transparent)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

/** Marketplace: oculto desde md. Panel: oculto desde lg. */
export const bottomNavMarketplaceVisibilityClass = 'md:hidden';
export const bottomNavPanelVisibilityClass = 'lg:hidden';

export const bottomNavPrimaryActionStyle: CSSProperties = {
    background: 'var(--button-primary-bg)',
    color: 'var(--button-primary-color)',
    boxShadow: 'var(--button-primary-shadow)',
};

export function bottomNavPrimaryActionStyleWithShadow(boxShadow?: string): CSSProperties {
    return {
        ...bottomNavPrimaryActionStyle,
        ...(boxShadow ? { boxShadow } : null),
    };
}

export const bottomNavStandardActiveColor = 'var(--accent)';
export const bottomNavStandardMutedColor = 'var(--fg-muted)';
