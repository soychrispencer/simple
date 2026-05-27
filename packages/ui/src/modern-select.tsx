'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import {
    FLOATING_POPOVER_Z_INDEX,
    useFloatingPortalDismiss,
    useFloatingPortalPosition,
} from './floating-portal.js';

export type ModernSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
    swatchColor?: string;
};

export type ModernSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: ModernSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
    triggerClassName?: string;
    dropdownClassName?: string;
    leadingIcon?: React.ReactNode;
};

export function ModernSelect({
    value,
    onChange,
    options,
    placeholder = 'Seleccionar',
    disabled = false,
    ariaLabel,
    triggerClassName,
    dropdownClassName,
    leadingIcon,
}: ModernSelectProps) {
    const [open, setOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const popoverPosition = useFloatingPortalPosition(open, triggerRef, popoverRef, [options.length]);

    useFloatingPortalDismiss(open, () => setOpen(false), rootRef, popoverRef);

    const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
                return;
            }
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setFocusedIndex((prev) => {
                    const next = prev + 1;
                    return next < enabledOptions.length ? next : prev;
                });
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                return;
            }
            if (event.key === 'Home') {
                event.preventDefault();
                setFocusedIndex(0);
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                setFocusedIndex(enabledOptions.length - 1);
                return;
            }
            if (event.key === 'Enter' && focusedIndex >= 0) {
                event.preventDefault();
                const option = enabledOptions[focusedIndex];
                if (option) { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }
                return;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, focusedIndex, enabledOptions, onChange]);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );
    const triggerLabel = selectedOption?.label ?? placeholder;

    // A11y: id needed for aria-activedescendant
    // Use deterministic ID based on placeholder + options count to avoid hydration mismatch
    const idPrefix = useMemo(() => {
        const base = placeholder.replace(/\s+/g, '-').toLowerCase();
        const hash = options.length.toString(36);
        return `select-${base}-${hash}`;
    }, [placeholder, options.length]);

    const listbox = open ? (
        <div
            ref={popoverRef}
            id={`${idPrefix}-listbox`}
            role="listbox"
            className={`max-h-64 overflow-auto rounded-xl border p-1.5 ${dropdownClassName ?? ''}`}
            style={{
                position: 'fixed',
                top: popoverPosition?.top ?? 0,
                left: popoverPosition?.left ?? 0,
                width: popoverPosition?.width ?? undefined,
                visibility: popoverPosition ? 'visible' : 'hidden',
                zIndex: FLOATING_POPOVER_Z_INDEX,
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                boxShadow: '0 18px 44px rgba(0,0,0,0.16)',
            }}
        >
            {options.map((option) => {
                const isSelected = option.value === value;
                const enabledIdx = enabledOptions.indexOf(option);
                const isFocused = enabledIdx >= 0 && enabledIdx === focusedIndex;
                return (
                    <button
                        key={`${option.value}-${option.label}`}
                        id={enabledIdx >= 0 ? `${idPrefix}-option-${enabledIdx}` : undefined}
                        role="option"
                        aria-selected={isSelected}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => {
                            if (option.disabled) return;
                            onChange(option.value);
                            setOpen(false);
                            triggerRef.current?.focus();
                        }}
                        onMouseEnter={() => { if (enabledIdx >= 0) setFocusedIndex(enabledIdx); }}
                        className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-sm transition-colors"
                        style={{
                            background: isFocused ? 'var(--bg-muted)' : isSelected ? 'var(--bg-subtle)' : 'transparent',
                            color: option.disabled ? 'var(--fg-faint)' : 'var(--fg)',
                            outline: isFocused ? '2px solid var(--accent-border)' : 'none',
                            outlineOffset: '-2px',
                        }}
                    >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                            {option.swatchColor ? (
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full border"
                                    style={{ background: option.swatchColor, borderColor: 'var(--border)' }}
                                />
                            ) : null}
                            <span className="truncate">{option.label}</span>
                        </span>
                        {isSelected ? <IconCheck size={14} style={{ color: 'var(--fg-secondary)' }} /> : null}
                    </button>
                );
            })}
        </div>
    ) : null;

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${idPrefix}-listbox`}
                aria-activedescendant={open && focusedIndex >= 0 ? `${idPrefix}-option-${focusedIndex}` : undefined}
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    const next = !open;
                    setOpen(next);
                    if (next) {
                        const idx = enabledOptions.findIndex((o) => o.value === value);
                        setFocusedIndex(idx >= 0 ? idx : 0);
                    }
                }}
                className={`form-input flex items-center text-left ${leadingIcon ? 'pl-9' : ''} ${triggerClassName ?? ''}`}
                style={{
                    color: selectedOption ? 'var(--fg)' : 'var(--fg-muted)',
                    paddingLeft: leadingIcon ? '2.2rem' : undefined,
                    paddingRight: '2.4rem',
                }}
            >
                {leadingIcon ? (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }}>
                        {leadingIcon}
                    </span>
                ) : null}
                <span className="flex min-w-0 items-center gap-2 truncate pr-1">
                    {selectedOption?.swatchColor ? (
                        <span
                            className="h-3 w-3 shrink-0 rounded-full border"
                            style={{ background: selectedOption.swatchColor, borderColor: 'var(--border)' }}
                        />
                    ) : null}
                    <span className="truncate">{triggerLabel}</span>
                </span>
                <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform"
                    style={{ color: 'var(--fg-muted)', transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}
                >
                    <IconChevronDown size={14} />
                </span>
            </button>

            {typeof document !== 'undefined' && listbox ? createPortal(listbox, document.body) : null}
        </div>
    );
}
