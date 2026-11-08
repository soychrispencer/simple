'use client';

import type { CSSProperties } from 'react';
import clsx from 'clsx';
import { getSimpleAppBrand, getSimpleBrandArtwork, type SimpleAppId } from '@simple/config';

export type BrandLogoVariant = 'default' | 'ghost' | 'onAccent' | 'watermark';

export type BrandLogoProps = {
    appId: SimpleAppId;
    className?: string;
    showWordmark?: boolean;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
    /** default: caja con tokens de acento; ghost: más liviano; onAccent: sobre fondos con --accent (p. ej. marketing/auth). */
    variant?: BrandLogoVariant;
};


function brandLogoIconWrapStyle(variant: BrandLogoVariant, appId: SimpleAppId): CSSProperties {
    if (appId === 'simpleagenda' && variant !== 'ghost' && variant !== 'watermark') {
        return {
            background: 'var(--agenda-lime, #B8DB3A)',
            borderColor: 'var(--agenda-lime, #B8DB3A)',
            color: 'var(--agenda-green, #002E32)',
            boxShadow: 'var(--shadow-sm)',
        };
    }

    switch (variant) {
        case 'ghost':
            return {
                background: 'transparent',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent-ink)',
            };
        case 'onAccent':
            return {
                background: 'var(--accent-contrast)',
                borderColor: 'color-mix(in oklab, var(--accent-contrast) 78%, var(--accent))',
                color: 'var(--accent-ink)',
                boxShadow: 'var(--shadow-sm)',
            };
        case 'watermark':
            return {
                background: 'rgba(255,255,255,0.2)',
                borderColor: 'rgba(255,255,255,0.34)',
                color: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
            };
        default:
            return {
                background: 'var(--accent-surface)',
                borderColor: 'var(--accent-surface)',
                color: 'var(--accent-surface-fg)',
                boxShadow: 'var(--shadow-sm)',
            };
    }
}

export function BrandLogo({
    appId,
    className,
    showWordmark = true,
    showIcon = true,
    size = 'md',
    variant = 'default',
}: BrandLogoProps) {
    const brand = getSimpleAppBrand(appId);
    const artwork = getSimpleBrandArtwork(appId);
    const wordmarkPrimary =
        variant === 'watermark'
            ? 'rgba(255,255,255,0.9)'
            : variant === 'onAccent'
                ? 'var(--accent-contrast)'
                : 'var(--fg)';
    const wordmarkHeight = variant === 'watermark' || size === 'sm' ? 18 : size === 'lg' ? 28 : 21;
    const wordmarkFontSize = Math.round(wordmarkHeight);
    const wordmarkSuffix = brand.shortName.replace(/^Simple/, '') || brand.shortName;

    const iconBox = clsx(
        'brand-logo__icon flex items-center justify-center border transition-[box-shadow,border-color,background-color,transform,filter] duration-[var(--serenatas-motion-duration,180ms)] ease-[var(--serenatas-motion-ease,cubic-bezier(0.16,1,0.3,1))]',
        size === 'sm' && variant !== 'watermark' && 'w-8 h-8 rounded-[var(--radius)]',
        size === 'sm' && variant === 'watermark' && 'w-9 h-9 rounded-[var(--radius)]',
        size === 'md' && 'w-9 h-9 rounded-[var(--radius)]',
        size === 'lg' && 'w-14 h-14 rounded-[var(--radius-lg)]',
        variant === 'default' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.04] group-hover:-translate-y-px',
        variant === 'ghost' &&
            'group-hover:border-[color:var(--accent)] group-hover:bg-[var(--accent-subtle)] group-hover:shadow-sm group-hover:-translate-y-px',
        variant === 'onAccent' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.03] group-hover:-translate-y-px',
        variant === 'watermark' && 'shadow-none'
    );

    return (
        <span
            role="img"
            aria-label={brand.shortName}
            className={clsx('inline-flex items-center group shrink-0', showIcon ? 'gap-2.5' : 'gap-0', className)}
            style={variant === 'watermark' ? { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.32))' } : undefined}
        >
            {showIcon ? (
                <span className={iconBox} style={brandLogoIconWrapStyle(variant, appId)}>
                    <svg aria-hidden="true" viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                        <g transform="translate(8 8)" dangerouslySetInnerHTML={{ __html: size === 'sm' || variant === 'watermark' ? artwork.micro : artwork.full }} />
                    </svg>
                </span>
            ) : null}
            {showWordmark ? (
                <span
                    aria-hidden="true"
                    className="brand-logo__wordmark inline-flex shrink-0 whitespace-nowrap leading-none"
                    style={{
                        color: wordmarkPrimary,
                        fontFamily: 'var(--font-display, Instrument Sans, Inter, sans-serif)',
                        fontSize: `${wordmarkFontSize}px`,
                        letterSpacing: '-0.045em',
                    }}
                >
                    <span style={{ fontWeight: 700 }}>Simple</span>
                    <span style={{ fontWeight: 400 }}>{wordmarkSuffix}</span>
                </span>
            ) : null}
        </span>
    );
}
