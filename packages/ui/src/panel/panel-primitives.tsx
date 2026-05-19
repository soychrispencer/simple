'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';

export function PanelBlockHeader(props: {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}) {
    const { title, description, actions, className } = props;
    return (
        <div className={joinClasses('mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--fg)]">{title}</h2>
                {description ? <p className="text-xs mt-1 text-[var(--fg-muted)]">{description}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div> : null}
        </div>
    );
}

export function PanelNotice(props: {
    children: ReactNode;
    className?: string;
    tone?: 'neutral' | 'success' | 'warning' | 'error';
}) {
    const { children, className, tone = 'neutral' } = props;
    const toneStyle = tone === 'success'
        ? { borderColor: 'rgba(4,120,87,0.25)', background: 'rgba(4,120,87,0.06)', color: '#047857' }
        : tone === 'warning'
            ? { borderColor: 'rgba(180,83,9,0.22)', background: 'rgba(180,83,9,0.06)', color: '#92400e' }
            : tone === 'error'
                ? { borderColor: 'rgba(185,28,28,0.20)', background: 'rgba(185,28,28,0.06)', color: '#b91c1c' }
                : { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)' };
    return (
        <div className={joinClasses('rounded-card border px-4 py-3 text-sm', className)} style={toneStyle}>
            {children}
        </div>
    );
}

export function PanelStatusBadge(props: {
    label: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    variant?: 'soft' | 'solid';
    size?: 'xs' | 'sm';
    className?: string;
}) {
    const { label, tone = 'neutral', variant = 'soft', size = 'xs', className } = props;
    const softTone = tone === 'success'
        ? { background: 'var(--color-success-bg, rgba(22,163,74,0.14))', color: 'var(--color-success-text, #166534)' }
        : tone === 'warning'
            ? { background: 'var(--color-warning-bg, rgba(234,179,8,0.18))', color: 'var(--color-warning-text, #92400e)' }
            : tone === 'danger'
                ? { background: 'var(--color-danger-bg, rgba(239,68,68,0.14))', color: 'var(--color-danger-text, #991b1b)' }
                : tone === 'info'
                    ? { background: 'var(--color-info-bg, rgba(59,130,246,0.14))', color: 'var(--color-info-text, #1d4ed8)' }
                    : { background: 'var(--bg-muted)', color: 'var(--fg-secondary)' };
    const solidTone = tone === 'success'
        ? { background: 'var(--color-success, #16a34a)', color: '#ffffff' }
        : tone === 'warning'
            ? { background: 'var(--color-warning, #eab308)', color: 'var(--surface)' }
            : tone === 'danger'
                ? { background: 'var(--color-danger, #ef4444)', color: '#ffffff' }
                : tone === 'info'
                    ? { background: 'var(--color-info)', color: '#ffffff' }
                    : { background: 'var(--accent)', color: '#ffffff' };
    return (
        <span
            className={joinClasses(
                'inline-flex items-center rounded-full font-medium',
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]',
                className,
            )}
            style={variant === 'solid' ? solidTone : softTone}
        >
            {label}
        </span>
    );
}

export function PanelChoiceCard(props: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    selected?: boolean;
    className?: string;
}) {
    const { children, onClick, type = 'button', disabled = false, selected = false, className } = props;
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={joinClasses(
                'rounded-card border p-4 text-left transition-[border-color,background,opacity,transform,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
                className,
            )}
            style={{
                borderColor: selected ? 'var(--border-strong)' : 'var(--border)',
                background: selected ? 'var(--bg-subtle)' : 'var(--surface)',
                boxShadow: selected ? '0 0 0 1px var(--border-strong), var(--shadow-xs)' : 'none',
            }}
        >
            {children}
        </button>
    );
}

export function PanelSwitch(props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
    size?: 'sm' | 'md';
}) {
    const { checked, onChange, disabled = false, className, ariaLabel, size = 'md' } = props;
    const dimensions = size === 'sm'
        ? { track: 'w-9 h-5', thumb: 'w-4 h-4', left: 2, right: 18 }
        : { track: 'w-11 h-6', thumb: 'w-5 h-5', left: 2, right: 22 };
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={joinClasses('relative inline-flex shrink-0 rounded-full transition-colors', dimensions.track, className)}
            style={{ background: checked ? 'var(--accent)' : 'var(--border-strong)' }}
        >
            <span
                className={joinClasses('absolute top-0.5 rounded-full bg-white shadow transition-transform', dimensions.thumb)}
                style={{ transform: `translateX(${checked ? dimensions.right : dimensions.left}px)` }}
            />
        </button>
    );
}
