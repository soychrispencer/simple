'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

export type ModernSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
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
    const rootRef = useRef<HTMLDivElement | null>(null);

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
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );
    const triggerLabel = selectedOption?.label ?? placeholder;

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => !disabled && setOpen((current) => !current)}
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
                <span className="truncate pr-1">{triggerLabel}</span>
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
                                className="w-full h-9 px-2.5 rounded-lg text-sm flex items-center justify-between transition-colors"
                                style={{
                                    background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                                    color: option.disabled ? 'var(--fg-faint)' : 'var(--fg)',
                                }}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected ? <IconCheck size={14} style={{ color: 'var(--fg-secondary)' }} /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
