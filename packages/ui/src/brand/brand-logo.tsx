'use client';

import type { ComponentType, CSSProperties } from 'react';
import { IconBuildingSkyscraper, IconCalendar, IconConfetti, IconSteeringWheel } from '@tabler/icons-react';
import clsx from 'clsx';
import { getSimpleAppBrand, type SimpleAppId } from '@simple/config';

export type BrandLogoVariant = 'default' | 'ghost' | 'onAccent';

export type BrandLogoProps = {
    appId: SimpleAppId;
    className?: string;
    showWordmark?: boolean;
    size?: 'sm' | 'md' | 'lg';
    /** default: caja con tokens de acento; ghost: más liviano; onAccent: sobre fondos con --accent (p. ej. marketing/auth). */
    variant?: BrandLogoVariant;
};

const BRAND_ICON_BY_APP: Record<SimpleAppId, ComponentType<{ size?: number; style?: CSSProperties }>> = {
    simpleautos: IconSteeringWheel,
    simplepropiedades: IconBuildingSkyscraper,
    simpleadmin: IconBuildingSkyscraper,
    simpleplataforma: IconBuildingSkyscraper,
    simpleagenda: IconCalendar,
    simpleserenatas: IconConfetti,
};

function brandLogoIconWrapStyle(variant: BrandLogoVariant): CSSProperties {
    switch (variant) {
        case 'ghost':
            return {
                background: 'transparent',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
            };
        case 'onAccent':
            return {
                background: 'var(--accent-contrast)',
                borderColor: 'color-mix(in oklab, var(--accent-contrast) 78%, var(--accent))',
                color: 'var(--accent)',
                boxShadow: 'var(--shadow-sm)',
            };
        default:
            return {
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
                boxShadow: 'var(--shadow-sm)',
            };
    }
}

export function BrandLogo({
    appId,
    className,
    showWordmark = true,
    size = 'md',
    variant = 'default',
}: BrandLogoProps) {
    const brand = getSimpleAppBrand(appId);
    const Icon = BRAND_ICON_BY_APP[appId];
    const secondary = brand.shortName.replace(/^Simple/, '') || brand.shortName;
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 18;
    const wordmarkClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

    const wordmarkPrimary = variant === 'onAccent' ? 'var(--accent-contrast)' : 'var(--fg)';
    const wordmarkSecondary =
        variant === 'onAccent'
            ? 'color-mix(in oklab, var(--accent-contrast) 88%, transparent)'
            : 'var(--accent)';

    const useImageLogo = appId === 'simpleserenatas';
    const iconBox = clsx(
        'flex items-center justify-center border transition-[box-shadow,border-color,background-color,transform,filter] duration-[var(--serenatas-motion-duration,180ms)] ease-[var(--serenatas-motion-ease,cubic-bezier(0.16,1,0.3,1))]',
        size === 'sm' && 'w-8 h-8 rounded-[var(--radius)]',
        size === 'md' && 'w-9 h-9 rounded-[var(--radius)]',
        size === 'lg' && 'w-14 h-14 rounded-[var(--radius-lg)]',
        variant === 'default' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.04] group-hover:-translate-y-px',
        variant === 'ghost' &&
            'group-hover:border-[color:var(--accent)] group-hover:bg-[var(--accent-subtle)] group-hover:shadow-sm group-hover:-translate-y-px',
        variant === 'onAccent' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.03] group-hover:-translate-y-px'
    );

    return (
        <span className={clsx('flex items-center gap-2 group shrink-0', className)}>
            <span className={iconBox} style={brandLogoIconWrapStyle(variant)}>
                {useImageLogo ? (
                    <img
                        src="/logo.png"
                        alt={brand.shortName}
                        className={clsx(
                            'h-full w-full rounded-[inherit] object-contain',
                            size === 'sm' && 'p-1.5',
                            size === 'md' && 'p-2',
                            size === 'lg' && 'p-3'
                        )}
                    />
                ) : (
                    <Icon size={iconSize} />
                )}
            </span>
            {showWordmark ? (
                <span
                    className={clsx(
                        'inline-flex items-baseline gap-[0.08rem] tracking-tight leading-none',
                        wordmarkClass
                    )}
                    style={{ color: wordmarkPrimary }}
                >
                    <span className="font-semibold leading-none">Simple</span>
                    <span className="font-normal leading-none" style={{ color: wordmarkSecondary }}>
                        {secondary}
                    </span>
                </span>
            ) : null}
        </span>
    );
}
