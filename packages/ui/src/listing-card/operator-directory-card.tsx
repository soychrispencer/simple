'use client';

import Link from 'next/link';
import { IconChevronRight, IconMapPin } from '@tabler/icons-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { getPanelButtonClassName, getPanelButtonStyle } from '../panel/panel-button.js';

const CARD_SHELL_CLASS =
    'group/card flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-border bg-surface shadow-sm ring-1 ring-black/[0.03] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 dark:ring-white/10';

const LOGO_FRAME =
    'flex shrink-0 items-center justify-center overflow-hidden rounded-card border-2 border-white/90 bg-accent-soft font-bold text-accent shadow-md';

const LOGO_SIZES = {
    sm: 'size-12 text-base',
    md: 'size-14 text-lg',
    lg: 'size-16 text-xl',
} as const;

export type OperatorDirectoryLogoSize = keyof typeof LOGO_SIZES;

export function OperatorDirectoryLogo({
    name,
    logoUrl,
    logoFallbackLetter,
    size = 'md',
    frameClassName,
}: {
    name: string;
    logoUrl?: string | null;
    logoFallbackLetter?: string;
    size?: OperatorDirectoryLogoSize;
    frameClassName?: string;
}) {
    const initial = (logoFallbackLetter ?? name).trim().charAt(0).toUpperCase() || '?';

    return (
        <div className={`${frameClassName ?? LOGO_FRAME} ${LOGO_SIZES[size]}`}>
            {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                <span>{initial}</span>
            )}
        </div>
    );
}

function CardShell({
    href,
    ariaLabel,
    onOpen,
    children,
}: {
    href?: string;
    ariaLabel: string;
    onOpen?: () => void;
    children: ReactNode;
}) {
    if (href) {
        return (
            <Link href={href} className={CARD_SHELL_CLASS} aria-label={ariaLabel}>
                {children}
            </Link>
        );
    }

    return (
        <article
            className={`${CARD_SHELL_CLASS} cursor-pointer`}
            tabIndex={0}
            role="link"
            aria-label={ariaLabel}
            onClick={onOpen}
            onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen?.();
                }
            }}
        >
            {children}
        </article>
    );
}

export type OperatorDirectoryCardProps = {
    href?: string;
    onOpen?: () => void;
    ariaLabel: string;
    name: string;
    coverUrl?: string | null;
    coverFallback?: ReactNode;
    logoUrl?: string | null;
    logoFallbackLetter?: string;
    /** Línea bajo el nombre en el hero (ubicación, rubro, etc.). */
    heroMeta?: ReactNode;
    /** Si se omite heroMeta, se puede pasar location como texto simple. */
    location?: string;
    heroBadges?: ReactNode;
    heroAction?: ReactNode;
    children: ReactNode;
    ctaLabel: string;
};

export function OperatorDirectoryCard({
    href,
    onOpen,
    ariaLabel,
    name,
    coverUrl,
    coverFallback,
    logoUrl,
    logoFallbackLetter,
    heroMeta,
    location,
    heroBadges,
    heroAction,
    children,
    ctaLabel,
}: OperatorDirectoryCardProps) {
    const resolvedHeroMeta = heroMeta ?? (location ? (
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-medium text-white/85">
            <IconMapPin size={14} className="shrink-0" aria-hidden />
            <span className="truncate" title={location}>
                {location}
            </span>
        </p>
    ) : null);

    return (
        <CardShell href={href} ariaLabel={ariaLabel} onOpen={onOpen}>
            <div className="relative aspect-video shrink-0 overflow-hidden bg-bg-subtle">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.04]"
                    />
                ) : (
                    coverFallback ?? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft via-bg-subtle to-bg-subtle text-accent/70">
                            <OperatorDirectoryLogo
                                name={name}
                                logoUrl={logoUrl}
                                logoFallbackLetter={logoFallbackLetter}
                                size="lg"
                                frameClassName="border-0 bg-transparent shadow-none text-3xl"
                            />
                        </div>
                    )
                )}
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-black/0"
                    aria-hidden
                />

                {heroBadges ? (
                    <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">{heroBadges}</div>
                ) : null}

                {heroAction ? (
                    <div className="absolute right-3 top-3 z-10">{heroAction}</div>
                ) : null}

                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3.5 sm:p-4">
                    <OperatorDirectoryLogo
                        name={name}
                        logoUrl={logoUrl}
                        logoFallbackLetter={logoFallbackLetter}
                        size="md"
                    />
                    <div className="min-w-0 flex-1 pb-0.5">
                        <h3
                            className="truncate text-lg font-bold leading-tight text-white drop-shadow-sm"
                            title={name}
                        >
                            {name}
                        </h3>
                        {resolvedHeroMeta}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3.5 p-4">
                {children}
                <span
                    className={getPanelButtonClassName({ className: 'mt-auto h-10 w-full' })}
                    style={getPanelButtonStyle('accent')}
                >
                    {ctaLabel}
                    <IconChevronRight
                        size={16}
                        className="transition-transform duration-300 group-hover/card:translate-x-0.5"
                        aria-hidden
                    />
                </span>
            </div>
        </CardShell>
    );
}

/** Bloque de etiqueta + valor usado en el cuerpo de la tarjeta. */
export function OperatorDirectoryCardStat({
    label,
    value,
    icon,
    align = 'left',
}: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    align?: 'left' | 'right';
}) {
    return (
        <div className={`min-w-0 flex-1 ${align === 'right' ? 'text-right' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {label}
            </p>
            <p className={`mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg-secondary ${align === 'right' ? 'justify-end' : ''}`}>
                {icon ? <span className="shrink-0 text-accent">{icon}</span> : null}
                <span className={align === 'right' ? '' : 'truncate'}>{value}</span>
            </p>
        </div>
    );
}

/** Sección inferior con borde (servicio principal, headline, etc.). */
export function OperatorDirectoryCardSection({
    label,
    title,
    detail,
    trailing,
    empty,
}: {
    label: string;
    title?: ReactNode;
    detail?: ReactNode;
    trailing?: ReactNode;
    empty?: ReactNode;
}) {
    if (!title && empty) {
        return (
            <div className="flex items-center gap-2 border-t border-border pt-3 text-sm text-fg-muted">
                {empty}
            </div>
        );
    }

    return (
        <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                    {label}
                </p>
                {title ? (
                    <p className="mt-1 truncate text-base font-semibold text-fg">{title}</p>
                ) : null}
                {detail ? (
                    <p className="mt-1 text-xs leading-relaxed text-fg-muted">{detail}</p>
                ) : null}
            </div>
            {trailing ? (
                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                    {trailing}
                </span>
            ) : null}
        </div>
    );
}

export function OperatorDirectoryHeroBadge({
    children,
    tone = 'light',
}: {
    children: ReactNode;
    tone?: 'light' | 'dark';
}) {
    if (tone === 'dark') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                {children}
            </span>
        );
    }

    return (
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm">
            {children}
        </span>
    );
}
