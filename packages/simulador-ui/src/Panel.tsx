'use client';

import type { ReactNode } from 'react';
import {
    cargaBadgeClass,
    cargaMensaje,
    type NivelRiesgoCarga,
} from './tokens';

/** Resultado principal con semáforo y desglose corto opcional. */
export function PanelPrincipal({
    etiqueta,
    valorPrincipal,
    valorSecundario,
    desglose,
    nivelCarga,
    porcentajeSobreRenta,
}: {
    etiqueta: string;
    valorPrincipal: string;
    /** Equivalente secundario (p. ej. CLP bajo UF). */
    valorSecundario?: string;
    desglose?: { label: string; valor: string }[];
    nivelCarga: NivelRiesgoCarga;
    porcentajeSobreRenta: string;
}) {
    return (
        <div className="marketplace-flow-section marketplace-flow-highlight p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                {etiqueta}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-[var(--fg)] sm:text-5xl">
                {valorPrincipal}
            </p>
            {valorSecundario ? (
                <p className="mt-1 text-sm font-medium tabular-nums text-[var(--fg-muted)]">
                    {valorSecundario}
                </p>
            ) : null}
            <div
                className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cargaBadgeClass(nivelCarga)}`}
            >
                <span>{cargaMensaje(nivelCarga)}</span>
                <span className="opacity-80 tabular-nums">{porcentajeSobreRenta}</span>
            </div>
            {desglose && desglose.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--fg-muted)] sm:grid-cols-3">
                    {desglose.map((item) => (
                        <div key={item.label} className="flex justify-between gap-2 sm:block">
                            <span>{item.label}</span>
                            <span className="font-medium tabular-nums text-[var(--fg)]">
                                {item.valor}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function TarjetaEscenario({
    etiqueta,
    destacada,
    valorPrincipal,
    subEtiqueta,
    detalle,
}: {
    etiqueta: string;
    destacada?: boolean;
    valorPrincipal: string;
    subEtiqueta?: string;
    detalle?: string;
}) {
    return (
        <div
            className={`marketplace-flow-section p-4 ${
                destacada ? 'marketplace-flow-highlight' : ''
            }`}
        >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                {etiqueta}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--fg)]">
                {valorPrincipal}
            </p>
            {subEtiqueta ? (
                <p className="text-[10px] text-[var(--fg-muted)]">{subEtiqueta}</p>
            ) : null}
            {detalle ? (
                <p className="mt-2 text-xs tabular-nums text-[var(--fg-muted)]">{detalle}</p>
            ) : null}
        </div>
    );
}

export function AlertasCompactas({ items }: { items: string[] }) {
    if (!items.length) return null;
    return (
        <div className="space-y-1.5">
            {items.map((item) => (
                <p
                    key={item}
                    className="rounded-card border px-3 py-2 text-xs"
                    style={{
                        borderColor: 'var(--color-warning-border)',
                        background: 'var(--color-warning-bg)',
                        color: 'var(--color-warning-text)',
                    }}
                >
                    {item}
                </p>
            ))}
        </div>
    );
}

export function DatoCompacto({
    label,
    valor,
    hint,
}: {
    label: string;
    valor: string;
    hint?: string;
}) {
    return (
        <div className="marketplace-flow-section flex items-baseline justify-between gap-3 px-4 py-3">
            <div>
                <p className="text-xs text-[var(--fg-muted)]">{label}</p>
                {hint ? <p className="text-[10px] text-[var(--fg-muted)]">{hint}</p> : null}
            </div>
            <p className="text-lg font-semibold tabular-nums text-[var(--fg)]">{valor}</p>
        </div>
    );
}

export function BotonCTA({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-button border px-5 py-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                borderColor: 'var(--accent)',
            }}
        >
            {children}
        </button>
    );
}

export function BotonSecundario({
    children,
    onClick,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex w-full items-center justify-center gap-2 rounded-button border px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60"
            style={{
                background: 'transparent',
                color: 'var(--fg)',
                borderColor: 'var(--border)',
            }}
        >
            {children}
        </button>
    );
}

export function DisclaimerLegal({ texto }: { texto: string }) {
    return <p className="text-center text-[10px] text-[var(--fg-muted)]">{texto}</p>;
}

export function ShellSimulador({
    eyebrow,
    titulo,
    subtitle,
    meta,
    children,
}: {
    eyebrow: string;
    titulo: string;
    subtitle: string;
    meta?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="marketplace-flow-page">
            <div className="marketplace-flow-header">
                <div className="container-app marketplace-flow-header-inner">
                    <div>
                        <p className="marketplace-flow-eyebrow">{eyebrow}</p>
                        <h1 className="marketplace-flow-title">{titulo}</h1>
                        <p className="marketplace-flow-subtitle">{subtitle}</p>
                    </div>
                    {meta ? <div className="marketplace-flow-meta">{meta}</div> : null}
                </div>
            </div>
            <div className="container-app panel-page marketplace-flow-body mx-auto max-w-7xl">
                {children}
            </div>
        </div>
    );
}

/** @deprecated Prefer AlertasCompactas / DatoCompacto for a cleaner layout. */
export function TarjetaDato({
    titulo,
    valorPrincipal,
    descripcion,
    advertencias,
}: {
    titulo: string;
    valorPrincipal: string;
    descripcion: string;
    advertencias?: string[];
}) {
    return (
        <div className="space-y-3">
            <DatoCompacto label={titulo} valor={valorPrincipal} hint={descripcion} />
            <AlertasCompactas items={advertencias ?? []} />
        </div>
    );
}

/** @deprecated Requirements belong off the main simulation surface. */
export function TarjetaRequisitos({
    titulo,
    items,
}: {
    titulo: string;
    items: readonly string[];
}) {
    return (
        <details className="marketplace-flow-section p-4 text-sm">
            <summary className="cursor-pointer font-medium text-[var(--fg)]">{titulo}</summary>
            <ul className="mt-3 space-y-1.5 text-[var(--fg-muted)]">
                {items.map((req) => (
                    <li key={req}>· {req}</li>
                ))}
            </ul>
        </details>
    );
}

export function EncabezadoSimulador({
    eyebrow,
    titulo,
    descripcion,
}: {
    eyebrow: string;
    titulo: string;
    descripcion: string;
}) {
    return (
        <div className="mb-6 max-w-2xl">
            <p className="marketplace-flow-eyebrow">{eyebrow}</p>
            <h1 className="marketplace-flow-title mt-1">{titulo}</h1>
            <p className="marketplace-flow-subtitle mt-1">{descripcion}</p>
        </div>
    );
}
