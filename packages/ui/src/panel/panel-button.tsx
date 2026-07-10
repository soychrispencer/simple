'use client';

import type { CSSProperties } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';

export type PanelButtonProps = {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    style?: CSSProperties;
    size?: PanelButtonSize;
    variant?: PanelButtonVariant;
    ariaLabel?: string;
};

type PanelButtonSize = 'sm' | 'md';

type PanelButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'success';

export function PanelButton(props: PanelButtonProps) {
    const {
        children,
        onClick,
        type = 'button',
        disabled = false,
        loading = false,
        className,
        style,
        size = 'md',
        variant = 'secondary',
        ariaLabel,
    } = props;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            className={getPanelButtonClassName({ size, className })}
            style={{ ...getPanelButtonStyle(variant), ...style }}
        >
            {loading ? <IconLoader2 className="animate-spin" size={16} /> : children}
        </button>
    );
}

export function getPanelButtonClassName(props?: {
    size?: PanelButtonSize;
    className?: string;
}) {
    const sizeClass = props?.size === 'sm'
        ? 'h-9 px-3 text-sm'
        : 'h-10 px-4 text-sm';

    return joinClasses(
        'panel-button inline-flex items-center justify-center gap-2 border font-medium transition-[background,color,border-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        sizeClass,
        props?.className,
    );
}

export function getPanelButtonStyle(variant: PanelButtonVariant = 'secondary') {
    return variant === 'primary'
        ? ({
            '--panel-btn-bg': 'var(--button-primary-bg)',
            '--panel-btn-color': 'var(--button-primary-color)',
            '--panel-btn-border': 'var(--button-primary-border)',
            '--panel-btn-shadow': 'var(--button-primary-shadow)',
            '--panel-btn-hover-bg': 'var(--button-primary-hover-bg)',
            '--panel-btn-hover-color': 'var(--button-primary-hover-color)',
            '--panel-btn-hover-border': 'var(--button-primary-hover-border)',
            '--panel-btn-hover-shadow': 'var(--button-primary-hover-shadow)',
        } as CSSProperties)
        : variant === 'danger'
            ? ({
                '--panel-btn-bg': 'var(--color-error-subtle, color-mix(in oklab, var(--color-error) 8%, transparent))',
                '--panel-btn-color': 'var(--color-error)',
                '--panel-btn-border': 'color-mix(in oklab, var(--color-error) 22%, transparent)',
                '--panel-btn-hover-bg': 'color-mix(in oklab, var(--color-error) 14%, transparent)',
                '--panel-btn-hover-color': 'var(--color-error)',
                '--panel-btn-hover-border': 'color-mix(in oklab, var(--color-error) 30%, transparent)',
            } as CSSProperties)
            : variant === 'ghost'
                ? ({
                    '--panel-btn-bg': 'transparent',
                    '--panel-btn-color': 'var(--fg-secondary)',
                    '--panel-btn-border': 'transparent',
                    '--panel-btn-hover-bg': 'var(--bg-muted)',
                    '--panel-btn-hover-color': 'var(--fg)',
                    '--panel-btn-hover-border': 'transparent',
                    '--panel-btn-hover-shadow': 'none',
                } as CSSProperties)
                : variant === 'accent'
                    ? ({
                        '--panel-btn-bg': 'var(--accent)',
                        '--panel-btn-color': 'var(--accent-contrast)',
                        '--panel-btn-border': 'var(--accent)',
                        '--panel-btn-shadow': 'none',
                        '--panel-btn-hover-bg': 'var(--accent)',
                        '--panel-btn-hover-color': 'var(--accent-contrast)',
                        '--panel-btn-hover-border': 'var(--accent)',
                        '--panel-btn-hover-shadow': 'none',
                    } as CSSProperties)
                    : variant === 'success'
                        ? ({
                            '--panel-btn-bg': 'color-mix(in oklab, #22c55e 14%, var(--surface))',
                            '--panel-btn-color': '#15803d',
                            '--panel-btn-border': 'color-mix(in oklab, #22c55e 35%, transparent)',
                            '--panel-btn-shadow': 'none',
                            '--panel-btn-hover-bg': 'color-mix(in oklab, #22c55e 18%, var(--surface))',
                            '--panel-btn-hover-color': '#15803d',
                            '--panel-btn-hover-border': 'color-mix(in oklab, #22c55e 45%, transparent)',
                            '--panel-btn-hover-shadow': 'none',
                        } as CSSProperties)
                        : ({
                        '--panel-btn-bg': 'var(--surface)',
                        '--panel-btn-color': 'var(--fg)',
                        '--panel-btn-border': 'var(--border)',
                        '--panel-btn-hover-bg': 'var(--bg-subtle)',
                        '--panel-btn-hover-color': 'var(--fg)',
                        '--panel-btn-hover-border': 'var(--border-strong)',
                        '--panel-btn-hover-shadow': 'var(--shadow-xs)',
                    } as CSSProperties);
}
