'use client';

import React, { useId, useState, type MouseEventHandler, type ReactNode } from 'react';
import { IconUser } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';
import { PanelCard } from './panel-card.js';

export type PanelSummaryRowProps = {
    label: string;
    value: ReactNode;
    valueClassName?: string;
};

export type PanelSummaryCardProps = {
    eyebrow?: string;
    title: ReactNode;
    rows?: PanelSummaryRowProps[];
    children?: ReactNode;
    className?: string;
};

export type PanelListProps = {
    children: ReactNode;
    className?: string;
};

export type PanelListHeaderProps = {
    children: ReactNode;
    className?: string;
};

export type PanelListRowProps = {
    children: ReactNode;
    className?: string;
    divider?: boolean;
    tone?: 'surface' | 'subtle';
    hoverTone?: 'none' | 'subtle' | 'muted';
};

export type PanelIconButtonProps = {
    children: ReactNode;
    label: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md';
    variant?: 'ghost' | 'soft' | 'inverse' | 'overlay';
};

export type PanelAccountProfileCardProps = {
    name?: string;
    email?: string;
    role?: string;
    subtitle?: string;
    className?: string;
};

export type PanelFieldProps = {
    label: string;
    hint?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
};

export type PanelPageHeaderProps = {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    backHref?: string;
    className?: string;
};

export type PanelActionsProps = {
    left?: ReactNode;
    right?: ReactNode;
    className?: string;
    rightClassName?: string;
};

export type PanelStatCardProps = {
    label: string;
    value: string;
    meta?: string;
    icon?: ReactNode;
    trend?: {
        label: string;
        tone?: 'positive' | 'negative' | 'neutral';
    };
};

export type PanelEmptyStateProps = {
    title?: string;
    description: string;
    action?: ReactNode;
    className?: string;
};

export function PanelSummaryCard(props: PanelSummaryCardProps) {
    const { eyebrow, title, rows, children, className } = props;

    return (
        <div className={joinClasses('rounded-card border p-4', className)} style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {eyebrow ? (
                <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                    {eyebrow}
                </p>
            ) : null}
            <div className={eyebrow ? 'mt-2' : ''}>
                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                    {title}
                </p>
            </div>
            {rows && rows.length > 0 ? (
                <div className="space-y-2 mt-3 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                    {rows.map((row, index) => (
                        <div key={`${String(row.label)}-${index}`} className="flex items-start justify-between gap-3">
                            <span style={{ color: 'var(--fg-muted)' }}>{row.label}</span>
                            <span className={joinClasses('text-right', row.valueClassName)} style={{ color: 'var(--fg-secondary)' }}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
            {children ? <div className="mt-3">{children}</div> : null}
        </div>
    );
}

export function PanelList(props: PanelListProps) {
    const { children, className } = props;

    return (
        <div
            className={joinClasses('rounded-card border overflow-hidden', className)}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            {children}
        </div>
    );
}

export function PanelListHeader(props: PanelListHeaderProps) {
    const { children, className } = props;

    return (
        <div
            className={joinClasses('hidden md:grid px-4 py-2.5 text-xs font-medium uppercase tracking-wider', className)}
            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
        >
            {children}
        </div>
    );
}

export function PanelListRow(props: PanelListRowProps) {
    const {
        children,
        className,
        divider = true,
        tone = 'surface',
        hoverTone = 'subtle',
    } = props;
    const [hovered, setHovered] = useState(false);

    const baseBackground = tone === 'subtle' ? 'var(--bg-subtle)' : 'var(--surface)';
    const nextBackground = hoverTone === 'muted'
        ? 'var(--bg-muted)'
        : hoverTone === 'subtle'
            ? 'var(--bg-subtle)'
            : baseBackground;

    return (
        <div
            className={className}
            style={{
                background: hovered ? nextBackground : baseBackground,
                borderTop: divider ? '1px solid var(--border)' : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {children}
        </div>
    );
}

export function PanelIconButton(props: PanelIconButtonProps) {
    const {
        children,
        label,
        onClick,
        type = 'button',
        disabled = false,
        className,
        size = 'sm',
        variant = 'ghost',
    } = props;

    const sizeClass = size === 'md' ? 'h-8 w-8' : 'h-7 w-7';
    const variantStyle = variant === 'soft'
        ? { background: 'var(--bg-muted)', color: 'var(--fg-muted)' }
        : variant === 'inverse'
            ? { background: 'var(--fg)', color: 'var(--bg)' }
            : variant === 'overlay'
                ? { background: 'color-mix(in oklab, var(--surface) 92%, transparent)', color: 'var(--fg)' }
                : { background: 'transparent', color: 'var(--fg-muted)' };

    return (
        <button
            type={type}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={joinClasses(
                'rounded-button flex items-center justify-center shrink-0 transition-[background,color,opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                sizeClass,
                className,
            )}
            style={variantStyle}
        >
            {children}
        </button>
    );
}

export function PanelPageHeader(props: PanelPageHeaderProps) {
    const { title, description, actions, backHref, className } = props;

    return (
        <div className={joinClasses('mb-5 lg:mb-6', className)}>
            {backHref ? (
                <a
                    href={backHref}
                    className="inline-flex items-center gap-1 text-xs font-medium mb-3 transition-colors"
                    style={{ color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    Configuración
                </a>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-1 text-sm break-words" style={{ color: 'var(--fg-muted)' }}>
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="flex w-full min-w-0 flex-nowrap items-center justify-end gap-2 sm:w-auto">{actions}</div> : null}
            </div>
        </div>
    );
}

export function PanelAccountProfileCard(props: PanelAccountProfileCardProps) {
    const {
        name = 'Usuario Simple',
        email = 'Sin correo',
        role,
        subtitle,
        className,
    } = props;

    return (
        <PanelCard className={joinClasses('space-y-4', className)} size="md">
            <div className="flex items-center gap-4">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                    <IconUser size={24} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{name}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{email}</p>
                    {role ? (
                        <p className="text-xs uppercase tracking-[0.16em] mt-1" style={{ color: 'var(--fg-muted)' }}>
                            {role}
                        </p>
                    ) : null}
                </div>
            </div>
            {subtitle ? (
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{subtitle}</p>
            ) : null}
        </PanelCard>
    );
}

export function PanelField(props: PanelFieldProps) {
    const { label, hint, required, children, className } = props;
    const fieldId = useId();
    return (
        <div className={joinClasses('flex flex-col gap-1.5', className)}>
            <label htmlFor={fieldId} className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                {label}{required ? <span style={{ color: 'var(--color-error)' }} className="ml-0.5">*</span> : null}
            </label>
            {React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id: fieldId })
                : children}
            {hint ? <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{hint}</p> : null}
        </div>
    );
}

export function PanelActions(props: PanelActionsProps) {
    const { left, right, className, rightClassName } = props;

    return (
        <div className={joinClasses('mt-5 flex items-center justify-between gap-3 flex-wrap', className)}>
            <div className="flex items-center gap-2 flex-wrap">
                {left}
            </div>
            <div className={joinClasses('flex items-center gap-2 flex-wrap justify-end', rightClassName)}>
                {right}
            </div>
        </div>
    );
}

export function PanelStatCard(props: PanelStatCardProps) {
    const { label, value, meta, icon, trend } = props;
    const trendTone = trend?.tone ?? 'neutral';
    const trendColor = trendTone === 'positive'
        ? '#166534'
        : trendTone === 'negative'
            ? '#991b1b'
            : 'var(--fg-secondary)';
    const trendBg = trendTone === 'positive'
        ? 'rgba(22,163,74,0.12)'
        : trendTone === 'negative'
            ? 'rgba(239,68,68,0.10)'
            : 'var(--bg-muted)';

    return (
        <div className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
                {icon ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        {icon}
                    </div>
                ) : <span />}
                {trend ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: trendBg, color: trendColor }}>
                        {trend.label}
                    </span>
                ) : null}
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            {meta ? <p className="mt-2 text-xs" style={{ color: 'var(--fg-secondary)' }}>{meta}</p> : null}
        </div>
    );
}

export function PanelEmptyState(props: PanelEmptyStateProps) {
    const { title = 'Sin resultados', description, action, className } = props;

    return (
        <div className={joinClasses('rounded-card border p-6 md:p-7 text-center', className)} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-secondary)' }}>{description}</p>
            {action ? <div className="mt-4 flex items-center justify-center">{action}</div> : null}
        </div>
    );
}
