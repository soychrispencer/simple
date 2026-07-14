'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { getPanelButtonClassName, getPanelButtonStyle } from './panel-button.js';
import { PanelButton } from './panel-button.js';

export type BusinessCatalogTabKey = 'services' | 'packs' | 'promotions';

export const BUSINESS_CATALOG_TAB_LABELS: Record<BusinessCatalogTabKey, string> = {
    services: 'Servicios',
    packs: 'Packs y bonos',
    promotions: 'Promociones',
};

/** Etiquetas del catálogo en explorador y perfil público (packs abreviado). */
export const BUSINESS_CATALOG_TAB_LABELS_PUBLIC: Record<BusinessCatalogTabKey, string> = {
    services: 'Servicios',
    packs: 'Packs',
    promotions: 'Ofertas',
};

export const AGENDA_BUSINESS_CATALOG_HREFS: Record<BusinessCatalogTabKey, string> = {
    services: '/panel/mis-servicios',
    packs: '/panel/mis-servicios/packs',
    promotions: '/panel/mis-servicios/promociones',
};

export type BusinessCatalogTabsProps = {
    active: BusinessCatalogTabKey;
    /** Botones con estado local o enlaces entre rutas del panel. */
    variant: 'buttons' | 'links';
    onChange?: (tab: BusinessCatalogTabKey) => void;
    hrefs?: Partial<Record<BusinessCatalogTabKey, string>>;
    counts?: Partial<Record<BusinessCatalogTabKey, number>>;
    /** En explorador público la pestaña de promos se llama "Ofertas". */
    promotionsLabel?: 'Promociones' | 'Ofertas';
    /** Panel usa "Packs y bonos"; público usa "Packs". */
    labelsVariant?: 'panel' | 'public';
};

function tabLabel(
    key: BusinessCatalogTabKey,
    promotionsLabel: BusinessCatalogTabsProps['promotionsLabel'],
    labelsVariant: BusinessCatalogTabsProps['labelsVariant'],
    count?: number,
) {
    const labels = labelsVariant === 'public'
        ? BUSINESS_CATALOG_TAB_LABELS_PUBLIC
        : BUSINESS_CATALOG_TAB_LABELS;
    const base = key === 'promotions'
        ? (promotionsLabel ?? labels.promotions)
        : labels[key];
    return count != null && count > 0 ? `${base} (${count})` : base;
}

function CatalogTabLink({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: ReactNode;
}) {
    const variant = active ? 'accent' : 'secondary';
    return (
        <Link
            href={href}
            className={getPanelButtonClassName({ size: 'sm' })}
            style={getPanelButtonStyle(variant)}
            aria-current={active ? 'page' : undefined}
        >
            {children}
        </Link>
    );
}

export function BusinessCatalogTabs({
    active,
    variant,
    onChange,
    hrefs,
    counts,
    promotionsLabel,
    labelsVariant = 'panel',
}: BusinessCatalogTabsProps) {
    const keys: BusinessCatalogTabKey[] = ['services', 'packs', 'promotions'];

    return (
        <div className="flex flex-wrap gap-2">
            {keys.map((key) => {
                const label = tabLabel(key, promotionsLabel, labelsVariant, counts?.[key]);
                const isActive = active === key;

                if (variant === 'links') {
                    const href = hrefs?.[key];
                    if (!href) return null;
                    return (
                        <CatalogTabLink key={key} href={href} active={isActive}>
                            {label}
                        </CatalogTabLink>
                    );
                }

                return (
                    <PanelButton
                        key={key}
                        variant={isActive ? 'accent' : 'secondary'}
                        size="sm"
                        onClick={() => onChange?.(key)}
                    >
                        {label}
                    </PanelButton>
                );
            })}
        </div>
    );
}
