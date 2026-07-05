'use client';

import { useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { IconDotsCircleHorizontal } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';
import { BottomNavPrimaryAction, BottomNavStandardItem } from '../layout/bottom-nav-primary-action';
import {
    BOTTOM_NAV_BAR_CLASS,
    BOTTOM_NAV_ITEM_CLASS,
    BOTTOM_NAV_ITEM_COMPACT_CLASS,
    BOTTOM_NAV_LABEL_CLASS,
    BOTTOM_NAV_LABEL_COMPACT_CLASS,
    BOTTOM_NAV_PRIMARY_LIFT_CLASS,
    bottomNavIsCompact,
    bottomNavPanelVisibilityClass,
    bottomNavShellClassName,
    bottomNavShellStyle,
} from '../layout/bottom-nav-styles';

export type PanelPillNavItem = {
    key: string;
    label: string;
    leading?: ReactNode;
    disabled?: boolean;
    tone?: 'neutral' | 'warning';
    badge?: string;
};

export type PanelPillNavProps = {
    items: PanelPillNavItem[];
    activeKey: string;
    onChange: (key: string) => void;
    ariaLabel?: string;
    mobileLabel?: string;
    breakpoint?: 'sm' | 'md' | 'lg';
    showMobileDropdown?: boolean;
    size?: 'sm' | 'md';
};

export type PanelStepNavItem = {
    key: string;
    label: string;
    done?: boolean;
    disabled?: boolean;
};

export type PanelStepNavProps = {
    items: PanelStepNavItem[];
    activeKey: string;
    onChange: (key: string) => void;
    ariaLabel?: string;
    labelBreakpoint?: 'always' | 'sm' | 'md' | 'lg';
};

export type PanelSearchFieldProps = {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    inputClassName?: string;
};

export type PanelSegmentedToggleItem = {
    key: string;
    label: string;
    icon?: ReactNode;
    ariaLabel?: string;
};

export type PanelSegmentedToggleProps = {
    items: PanelSegmentedToggleItem[];
    activeKey: string;
    onChange: (key: string) => void;
    className?: string;
    size?: 'sm' | 'md';
    iconOnly?: boolean;
};

export function PanelPillNav(props: PanelPillNavProps) {
    const {
        items,
        activeKey,
        onChange,
        ariaLabel = 'Navegación de panel',
        mobileLabel = 'Sección actual',
        breakpoint = 'lg',
        showMobileDropdown = true,
        size = 'md',
    } = props;

    const [mobileOpen, setMobileOpen] = useState(false);
    const activeItem = items.find((item) => item.key === activeKey) ?? items[0];
    const visibilityClass = breakpoint === 'sm'
        ? { mobile: 'sm:hidden', desktop: 'hidden sm:flex' }
        : breakpoint === 'md'
            ? { mobile: 'md:hidden', desktop: 'hidden md:flex' }
            : { mobile: 'lg:hidden', desktop: 'hidden lg:flex' };

    const desktopButtonClass = size === 'sm'
        ? 'shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)'
        : 'shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)';
    const desktopRowClass = size === 'sm'
        ? `${visibilityClass.desktop} flex-nowrap items-center gap-1.5 overflow-x-auto pb-1`
        : `${visibilityClass.desktop} flex-nowrap items-center gap-2 overflow-x-auto pb-1`;
    const triggerClass = size === 'sm'
        ? 'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-card text-left'
        : 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-card text-left';

    return (
        <>
            {showMobileDropdown ? (
                <div className={`${visibilityClass.mobile} space-y-2`}>
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                        {mobileLabel}
                    </p>
                    <button
                        type="button"
                        onClick={() => setMobileOpen((current) => !current)}
                        className={triggerClass}
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                    >
                        <div className="min-w-0 flex items-center gap-2 text-sm font-medium">
                            {activeItem?.leading ? <span style={{ color: 'var(--fg-muted)' }}>{activeItem.leading}</span> : null}
                            <span className="truncate">{activeItem?.label}</span>
                        </div>
                        <span
                            className="shrink-0 transition-transform"
                            style={{ transform: `rotate(${mobileOpen ? '180deg' : '0deg'})`, color: 'var(--fg-muted)' }}
                            aria-hidden="true"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6.5L8 10L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </button>

                    {mobileOpen ? (
                        <div className="overflow-hidden rounded-card border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                            {items.map((item, index) => {
                                const isActive = item.key === activeKey;
                                const isDisabled = Boolean(item.disabled);
                                const isWarning = item.tone === 'warning';
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            setMobileOpen(false);
                                            onChange(item.key);
                                        }}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors"
                                        style={{
                                            borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                                            background: isActive
                                                ? isWarning
                                                    ? 'color-mix(in oklab, var(--danger) 8%, var(--bg-muted) 92%)'
                                                    : 'var(--bg-subtle)'
                                                : 'transparent',
                                            color: isActive
                                                ? isWarning
                                                    ? 'var(--danger)'
                                                    : 'var(--fg)'
                                                : isDisabled
                                                    ? 'var(--fg-faint)'
                                                    : isWarning
                                                        ? 'color-mix(in oklab, var(--danger) 78%, var(--fg) 22%)'
                                                        : 'var(--fg-secondary)',
                                            opacity: isDisabled ? 0.6 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {item.leading ? <span style={{ color: isActive ? (isWarning ? 'var(--danger)' : 'var(--fg)') : 'var(--fg-muted)' }}>{item.leading}</span> : null}
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {item.badge ? (
                                            <span
                                                className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                                style={{
                                                    color: isWarning ? 'white' : 'var(--fg)',
                                                    background: isWarning ? 'var(--danger)' : 'var(--bg-muted)',
                                                }}
                                            >
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <nav className={desktopRowClass} aria-label={ariaLabel}>
                {items.map((item) => {
                    const isActive = item.key === activeKey;
                    const isDisabled = Boolean(item.disabled);
                    const isWarning = item.tone === 'warning';
                    return (
                        <button
                            key={item.key}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                                if (!isDisabled) onChange(item.key);
                            }}
                            className={desktopButtonClass}
                            style={{
                                background: isActive
                                    ? isWarning
                                        ? 'color-mix(in oklab, var(--danger) 8%, var(--bg-muted) 92%)'
                                        : 'var(--button-primary-bg)'
                                    : 'transparent',
                                borderColor: isActive
                                    ? isWarning
                                        ? 'color-mix(in oklab, var(--danger) 55%, var(--border) 45%)'
                                        : 'var(--button-primary-border)'
                                    : isWarning
                                        ? 'color-mix(in oklab, var(--danger) 35%, var(--border) 65%)'
                                        : 'var(--border)',
                                color: isActive
                                    ? isWarning
                                        ? 'var(--danger)'
                                        : 'var(--button-primary-color)'
                                    : isDisabled
                                        ? 'var(--fg-faint)'
                                        : isWarning
                                            ? 'color-mix(in oklab, var(--danger) 78%, var(--fg) 22%)'
                                            : 'var(--fg-muted)',
                                opacity: isDisabled ? 0.62 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {item.leading ? <span style={{ color: isActive ? (isWarning ? 'var(--danger)' : 'var(--button-primary-color)') : 'var(--fg-secondary)' }}>{item.leading}</span> : null}
                            <span>{item.label}</span>
                            {item.badge ? (
                                <span
                                    className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{
                                        color: isWarning ? 'white' : isActive ? 'var(--button-primary-bg)' : 'var(--fg)',
                                        background: isWarning ? 'var(--danger)' : isActive ? 'var(--button-primary-color)' : 'var(--bg-muted)',
                                    }}
                                >
                                    {item.badge}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

export function PanelStepNav(props: PanelStepNavProps) {
    const {
        items,
        activeKey,
        onChange,
        ariaLabel = 'Pasos del flujo',
        labelBreakpoint = 'sm',
    } = props;

    const labelClass = labelBreakpoint === 'always'
        ? 'inline'
        : labelBreakpoint === 'md'
            ? 'hidden md:inline'
            : labelBreakpoint === 'lg'
                ? 'hidden lg:inline'
                : 'hidden sm:inline';

    return (
        <nav
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1"
            aria-label={ariaLabel}
        >
            {items.map((item, index) => {
                const isActive = item.key === activeKey;
                const isComplete = Boolean(item.done);
                const isDisabled = Boolean(item.disabled);
                return (
                    <div key={item.key} className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                                if (!isDisabled) onChange(item.key);
                            }}
                            className="inline-flex items-center gap-2 rounded-full px-1.5 py-1.5 text-sm transition-colors hover:bg-(--bg-subtle)"
                            style={{
                                color: isActive || isComplete ? 'var(--fg)' : isDisabled ? 'var(--fg-faint)' : 'var(--fg-muted)',
                                opacity: isDisabled ? 0.62 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                            }}
                        >
                            <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all"
                                style={{
                                    background: isActive || isComplete ? 'var(--button-primary-bg)' : 'var(--bg-muted)',
                                    color: isActive || isComplete ? 'var(--button-primary-color)' : 'var(--fg-muted)',
                                    boxShadow: isActive ? '0 0 0 1px var(--button-primary-border), var(--shadow-xs)' : 'none',
                                }}
                            >
                                {isComplete ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                        <path d="M2.5 6.1L4.9 8.5L9.5 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span className={`${labelClass} text-xs sm:text-sm font-medium whitespace-nowrap`}>{item.label}</span>
                        </button>
                        {index < items.length - 1 ? (
                            <span
                                className="h-px w-7 sm:w-10 shrink-0 rounded-full"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, var(--border) 18%, var(--border) 82%, transparent 100%)' }}
                                aria-hidden="true"
                            />
                        ) : null}
                    </div>
                );
            })}
        </nav>
    );
}

export function PanelSearchField(props: PanelSearchFieldProps) {
    const {
        placeholder = 'Buscar',
        value,
        onChange,
        className,
        inputClassName,
    } = props;

    return (
        <div className={joinClasses('relative', className)}>
            <span
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--fg-muted)' }}
                aria-hidden="true"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21L16.65 16.65M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            <input
                type="text"
                value={value}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
                placeholder={placeholder}
                className={joinClasses('form-input h-9 w-full pl-9 text-sm', inputClassName)}
            />
        </div>
    );
}

export function PanelSegmentedToggle(props: PanelSegmentedToggleProps) {
    const { items, activeKey, onChange, className, size = 'sm', iconOnly = false } = props;
    const buttonClass = iconOnly
        ? size === 'md'
            ? 'h-9 w-9 justify-center px-0'
            : 'h-8 w-8 justify-center px-0'
        : size === 'md'
            ? 'h-9 px-3'
            : 'h-8 px-2.5';

    return (
        <div
            className={joinClasses('inline-flex items-center gap-0.5 rounded-xl p-0.5', className)}
            style={{ background: 'var(--bg-muted)' }}
        >
            {items.map((item) => {
                const isActive = item.key === activeKey;
                return (
                    <button
                        key={item.key}
                        type="button"
                        aria-label={item.ariaLabel || item.label}
                        onClick={() => onChange(item.key)}
                        className={joinClasses('inline-flex items-center gap-1.5 rounded-button text-sm font-medium transition-colors hover:text-(--fg)', buttonClass)}
                        style={{
                            background: isActive ? 'var(--button-primary-bg)' : 'transparent',
                            color: isActive ? 'var(--button-primary-color)' : 'var(--fg-muted)',
                            boxShadow: isActive ? '0 0 0 1px var(--button-primary-border)' : 'none',
                        }}
                    >
                        {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                        {!iconOnly ? <span>{item.label}</span> : null}
                    </button>
                );
            })}
        </div>
    );
}

export type PanelBottomNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties }>;
    active?: boolean;
    highlight?: boolean;
};

type PanelBottomNavLinkProps = {
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    children: ReactNode;
};

export type PanelBottomNavProps = {
    items: PanelBottomNavItem[];
    LinkComponent: ComponentType<PanelBottomNavLinkProps>;
    moreLabel?: string;
    moreActive?: boolean;
    onMoreClick?: () => void;
    ariaLabel?: string;
    highlightStyle?: CSSProperties;
};

export function PanelBottomNav({
    items,
    LinkComponent,
    moreLabel = 'Más',
    moreActive = false,
    onMoreClick,
    ariaLabel = 'Navegación del panel',
    highlightStyle,
}: PanelBottomNavProps) {
    const compact = bottomNavIsCompact(items.length, !!onMoreClick);
    const itemClass = compact ? BOTTOM_NAV_ITEM_COMPACT_CLASS : BOTTOM_NAV_ITEM_CLASS;
    const labelClass = compact ? BOTTOM_NAV_LABEL_COMPACT_CLASS : BOTTOM_NAV_LABEL_CLASS;

    return (
        <nav
            className={`${bottomNavShellClassName} ${bottomNavPanelVisibilityClass}`}
            style={bottomNavShellStyle}
            aria-label={ariaLabel}
        >
            <div className={BOTTOM_NAV_BAR_CLASS}>
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = !!item.active;

                    if (item.highlight) {
                        return (
                            <LinkComponent
                                key={item.href}
                                href={item.href}
                                className={`${itemClass} ${BOTTOM_NAV_PRIMARY_LIFT_CLASS}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <BottomNavPrimaryAction
                                    icon={Icon}
                                    label={item.label}
                                    active={active}
                                    boxShadow={highlightStyle?.boxShadow}
                                    labelClassName={labelClass}
                                />
                            </LinkComponent>
                        );
                    }

                    return (
                        <LinkComponent
                            key={item.href}
                            href={item.href}
                            className={itemClass}
                            aria-current={active ? 'page' : undefined}
                        >
                            <BottomNavStandardItem icon={Icon} label={item.label} active={active} labelClassName={labelClass} />
                        </LinkComponent>
                    );
                })}

                {onMoreClick ? (
                    <button
                        type="button"
                        onClick={onMoreClick}
                        className={itemClass}
                        aria-label={moreLabel}
                    >
                        <BottomNavStandardItem
                            icon={IconDotsCircleHorizontal}
                            label={moreLabel}
                            active={moreActive}
                            labelClassName={labelClass}
                        />
                    </button>
                ) : null}
            </div>
        </nav>
    );
}
