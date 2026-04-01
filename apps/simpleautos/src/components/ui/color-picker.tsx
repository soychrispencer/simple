'use client';

import { useEffect, useRef, useState } from 'react';
import { IconChevronDown, IconCheck, IconPencil } from '@tabler/icons-react';

export const VEHICLE_COLORS = [
    { label: 'Negro',        hex: '#111111' },
    { label: 'Blanco',       hex: '#f8f8f8' },
    { label: 'Blanco Perla', hex: '#f5f0e0' },
    { label: 'Plata',        hex: '#c0c0c0' },
    { label: 'Gris',         hex: '#888888' },
    { label: 'Gris Oscuro',  hex: '#484848' },
    { label: 'Rojo',         hex: '#cc2200' },
    { label: 'Burdeos',      hex: '#7a1d1d' },
    { label: 'Azul',         hex: '#1565c0' },
    { label: 'Azul Marino',  hex: '#0d1b4e' },
    { label: 'Celeste',      hex: '#5ba3d6' },
    { label: 'Verde',        hex: '#2e7d32' },
    { label: 'Amarillo',     hex: '#e6a800' },
    { label: 'Naranjo',      hex: '#e65100' },
    { label: 'Café',         hex: '#6d4c41' },
    { label: 'Beige',        hex: '#d4c4a0' },
    { label: 'Dorado',       hex: '#c8a84b' },
    { label: 'Morado',       hex: '#7b1fa2' },
];

export function ColorPicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (color: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [customMode, setCustomMode] = useState(
        () => !!value && !VEHICLE_COLORS.some((c) => c.label === value)
    );
    const [customValue, setCustomValue] = useState(
        () => (!VEHICLE_COLORS.some((c) => c.label === value) ? value : '')
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const customInputRef = useRef<HTMLInputElement>(null);
    const matched = VEHICLE_COLORS.find((c) => c.label === value);

    useEffect(() => {
        if (!open) return;
        function handleOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [open]);

    function selectColor(label: string) {
        onChange(label);
        setCustomMode(false);
        setOpen(false);
    }

    function activateCustom() {
        setCustomMode(true);
        setOpen(false);
        onChange(customValue);
        setTimeout(() => customInputRef.current?.focus(), 30);
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                className="form-input w-full flex items-center gap-2 text-left cursor-pointer"
                onClick={() => setOpen((o) => !o)}
            >
                {matched ? (
                    <>
                        <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: matched.hex, border: '1px solid rgba(0,0,0,0.18)' }} />
                        <span className="flex-1 text-sm text-(--fg)">{matched.label}</span>
                    </>
                ) : value ? (
                    <>
                        <span className="h-3.5 w-3.5 rounded-full shrink-0 bg-(--bg-muted)" style={{ border: '1px solid rgba(0,0,0,0.12)' }} />
                        <span className="flex-1 text-sm text-(--fg)">{value}</span>
                    </>
                ) : (
                    <span className="flex-1 text-sm text-(--fg-muted)">Seleccionar</span>
                )}
                <IconChevronDown size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-(--radius) border border-(--border) bg-(--bg) shadow-lg p-1.5">
                    <div className="flex flex-col max-h-60 overflow-y-auto">
                        {VEHICLE_COLORS.map(({ label, hex }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => selectColor(label)}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                                    value === label ? 'bg-(--bg-subtle)' : 'hover:bg-(--bg-subtle)'
                                }`}
                            >
                                <span className="h-4 w-4 rounded-full shrink-0" style={{ background: hex, border: '1px solid rgba(0,0,0,0.18)' }} />
                                <span className="flex-1" style={{ color: 'var(--fg)' }}>{label}</span>
                                {value === label && <IconCheck size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-(--border) mt-1.5 pt-1.5">
                        <button
                            type="button"
                            onClick={activateCustom}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs w-full text-left transition-colors hover:bg-(--bg-subtle) ${customMode ? 'bg-(--bg-subtle)' : ''}`}
                        >
                            <IconPencil size={12} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--fg-secondary)' }}>Otro color…</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Custom input */}
            {customMode && (
                <input
                    ref={customInputRef}
                    className="form-input mt-2"
                    placeholder="Ej: Verde Botella, Azul Petróleo…"
                    value={customValue}
                    onChange={(e) => {
                        setCustomValue(e.target.value);
                        onChange(e.target.value);
                    }}
                />
            )}
        </div>
    );
}
