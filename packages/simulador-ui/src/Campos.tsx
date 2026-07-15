'use client';

import type { ReactNode } from 'react';

export function parseNumero(valor: string): number {
    const limpio = valor.replace(/[^\d]/g, '');
    return limpio ? parseInt(limpio, 10) : 0;
}

export function CampoMoneda({
    label,
    valor,
    onChange,
    placeholder,
    ayuda,
}: {
    label: string;
    valor: number;
    onChange: (v: number) => void;
    placeholder?: string;
    ayuda?: string;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            {label ? (
                <label className="block text-sm font-medium leading-5 text-[var(--fg)]">
                    {label}
                </label>
            ) : null}
            <input
                type="text"
                inputMode="numeric"
                className="form-input w-full"
                value={valor ? valor.toLocaleString('es-CL') : ''}
                placeholder={placeholder}
                onChange={(e) => onChange(parseNumero(e.target.value))}
            />
            {ayuda ? <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{ayuda}</p> : null}
        </div>
    );
}

export function CampoNumero({
    label,
    valor,
    onChange,
    min,
    max,
    placeholder,
}: {
    label: string;
    valor: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    placeholder?: string;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <label className="block text-sm font-medium leading-5 text-[var(--fg)]">{label}</label>
            <input
                type="text"
                inputMode="numeric"
                className="form-input w-full"
                value={valor > 0 ? String(valor) : ''}
                placeholder={placeholder}
                onChange={(e) => {
                    const next = parseNumero(e.target.value);
                    if (max != null && next > max) {
                        onChange(max);
                        return;
                    }
                    if (min != null && next > 0 && next < min) {
                        onChange(next);
                        return;
                    }
                    onChange(next);
                }}
            />
        </div>
    );
}

export function CampoSlider({
    label,
    valorTexto,
    min,
    max,
    step,
    valor,
    onChange,
    pie,
}: {
    label: string;
    valorTexto: string;
    min: number;
    max: number;
    step: number;
    valor: number;
    onChange: (v: number) => void;
    pie?: ReactNode;
}) {
    return (
        <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <label className="text-sm font-medium leading-5 text-[var(--fg)]">{label}</label>
                <div className="marketplace-flow-range-label text-sm">
                    <span className="font-semibold tabular-nums text-[var(--fg)]">{valorTexto}</span>
                    {pie}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={valor}
                onChange={(e) => onChange(parseInt(e.target.value, 10))}
                className="marketplace-flow-range"
            />
        </div>
    );
}

export function Segmentado<T extends string>({
    label,
    opciones,
    valor,
    onChange,
}: {
    label: string;
    opciones: { value: T; label: string }[];
    valor: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--fg)]">{label}</label>
            <div
                className="grid gap-2.5"
                style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
            >
                {opciones.map((op) => (
                    <button
                        key={op.value}
                        type="button"
                        onClick={() => onChange(op.value)}
                        className={`marketplace-flow-option px-3 py-2.5 transition-colors ${
                            valor === op.value ? 'marketplace-flow-option--active' : ''
                        }`}
                    >
                        <p className="text-sm font-medium text-[var(--fg)]">{op.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function TarjetaFormulario({ children }: { children: ReactNode }) {
    return (
        <div className="marketplace-flow-section h-fit space-y-8 p-7 sm:space-y-9 sm:p-8 lg:col-span-2">
            {children}
        </div>
    );
}
