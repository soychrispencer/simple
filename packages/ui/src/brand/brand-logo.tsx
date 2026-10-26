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
    const wordmarkSecondary = wordmarkPrimary;

    const wordmarkHeight = variant === 'watermark' || size === 'sm' ? 18 : size === 'lg' ? 28 : 21;

    const iconBox = clsx(
        'flex items-center justify-center border transition-[box-shadow,border-color,background-color,transform,filter] duration-[var(--serenatas-motion-duration,180ms)] ease-[var(--serenatas-motion-ease,cubic-bezier(0.16,1,0.3,1))]',
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
                <span className={iconBox} style={brandLogoIconWrapStyle(variant)}>
                    <svg aria-hidden="true" viewBox="0 0 80 80" width="100%" height="100%" fill="none">
                        <g transform="translate(8 8)" dangerouslySetInnerHTML={{ __html: size === 'sm' || variant === 'watermark' ? artwork.micro : artwork.full }} />
                    </svg>
                </span>
            ) : null}
            {showWordmark ? (
                <svg
                    aria-hidden="true"
                    viewBox={`0 0 ${artwork.wordmarkWidth} ${artwork.wordmarkHeight}`}
                    height={wordmarkHeight}
                    width={wordmarkHeight * artwork.wordmarkWidth / artwork.wordmarkHeight}
                    className="shrink-0 overflow-visible"
                >
                    <g style={{ color: wordmarkPrimary }} dangerouslySetInnerHTML={{ __html: artwork.wordmarkPrimary }} />
                    <g style={{ color: wordmarkSecondary }} dangerouslySetInnerHTML={{ __html: artwork.wordmarkSecondary }} />
                </svg>
            ) : null}
        </span>
    );
}
