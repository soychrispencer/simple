'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

export type ModernSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
    swatchColor?: string;
};

type ModernSelectProps = {
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

export default function ModernSelect({
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

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, []);

    useEffect(() => {
        if (!open) return;
        const enabledOptions = options.filter((o) => !o.disabled);
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
                if (option) { onChange(option.value); setOpen(false); }
                return;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, focusedIndex, options, onChange]);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );
    const triggerLabel = selectedOption?.label ?? placeholder;

    const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }}>
                        {leadingIcon}
                    </span>
                ) : null}
                <span className="truncate pr-1 flex items-center gap-2 min-w-0">
                    {selectedOption?.swatchColor ? (
                        <span
                            className="h-3 w-3 rounded-full border shrink-0"
                            style={{ background: selectedOption.swatchColor, borderColor: 'var(--border)' }}
                        />
                    ) : null}
                    <span className="truncate">{triggerLabel}</span>
                </span>
                <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                    style={{ color: 'var(--fg-muted)', transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}
                >
                    <IconChevronDown size={14} />
                </span>
            </button>

            {open ? (
                <div
                    role="listbox"
                    className={`absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-64 overflow-auto rounded-xl border p-1.5 ${dropdownClassName ?? ''}`}
                    style={{
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
                                type="button"
                                disabled={option.disabled}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                onMouseEnter={() => { if (enabledIdx >= 0) setFocusedIndex(enabledIdx); }}
                                className="w-full h-9 px-2.5 rounded-lg text-sm flex items-center justify-between transition-colors"
                                style={{
                                    background: isFocused ? 'var(--bg-muted)' : isSelected ? 'var(--bg-subtle)' : 'transparent',
                                    color: option.disabled ? 'var(--fg-faint)' : 'var(--fg)',
                                    outline: isFocused ? '2px solid var(--accent-border)' : 'none',
                                    outlineOffset: '-2px',
                                }}
                            >
                                <span className="truncate flex items-center gap-2 min-w-0">
                                    {option.swatchColor ? (
                                        <span
                                            className="h-3 w-3 rounded-full border shrink-0"
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
            ) : null}
        </div>
    );
}
