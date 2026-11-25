'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconCopy, IconExternalLink, IconGlobe, IconLoader2, IconRefresh, IconTrash } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelField, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';
import {
    deleteAgendaCustomDomain,
    fetchAgendaCustomDomain,
    hasAgendaProPlusAccess,
    saveAgendaCustomDomain,
    verifyAgendaCustomDomain,
    type AgendaCustomDomainState,
    type AgendaProfile,
} from '@/lib/agenda-api';

function extractDnsHostLabel(domain: string): string {
    const parts = domain.split('.');
    if (parts.length <= 2) return '@';
    return parts.slice(0, -2).join('.');
}

export function AgendaCustomDomainCard({ profile }: { profile: AgendaProfile }) {
    const [state, setState] = useState<AgendaCustomDomainState>({
        customDomain: profile.customDomain ?? null,
        customDomainStatus: profile.customDomainStatus ?? 'none',
        customDomainVerifiedAt: profile.customDomainVerifiedAt ?? null,
        targetHost: 'simpleagenda.app',
        proPlusEligible: hasAgendaProPlusAccess(profile),
    });
    const [domainInput, setDomainInput] = useState(profile.customDomain ?? '');
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [copiedTarget, setCopiedTarget] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        void fetchAgendaCustomDomain()
            .then((data) => {
                if (!active) return;
                setState(data);
                setDomainInput(data.customDomain ?? '');
            })
            .catch(() => {
                // Keep initial profile snapshot if secondary fetch fails.
            });
        return () => {
            active = false;
        };
    }, [profile.id, profile.plan]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const res = await saveAgendaCustomDomain(domainInput);
            if (!res.ok) {
                setError(res.error ?? 'No pudimos guardar el dominio.');
                return;
            }
            setState((prev) => ({
                ...prev,
                customDomain: res.customDomain ?? null,
                customDomainStatus: res.customDomainStatus ?? 'pending',
                customDomainVerifiedAt: res.customDomainVerifiedAt ?? null,
                targetHost: res.targetHost ?? prev.targetHost,
            }));
            setDomainInput(res.customDomain ?? domainInput.trim().toLowerCase());
            setMessage('Dominio guardado. Configura el CNAME en tu proveedor DNS y pulsa Verificar DNS.');
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        setError('');
        setMessage('');
        try {
            const res = await verifyAgendaCustomDomain();
            if (!res.ok) {
                setState((prev) => ({
                    ...prev,
                    customDomainStatus: res.customDomainStatus ?? 'error',
                }));
                setError(res.error ?? 'Aún no detectamos el registro DNS.');
                return;
            }
            setState((prev) => ({
                ...prev,
                customDomain: res.customDomain ?? prev.customDomain,
                customDomainStatus: 'verified',
                customDomainVerifiedAt: res.customDomainVerifiedAt ?? new Date().toISOString(),
            }));
            setMessage('Dominio verificado y conectado con SSL automático.');
        } finally {
            setVerifying(false);
        }
    };

    const handleRemove = async () => {
        setRemoving(true);
        setError('');
        setMessage('');
        try {
            const res = await deleteAgendaCustomDomain();
            if (!res.ok) {
                setError(res.error ?? 'No pudimos quitar el dominio.');
                return;
            }
            setState((prev) => ({
                ...prev,
                customDomain: null,
                customDomainStatus: 'none',
                customDomainVerifiedAt: null,
            }));
            setDomainInput('');
            setMessage('Dominio desconectado.');
        } finally {
            setRemoving(false);
        }
    };

    const handleCopyTarget = async () => {
        try {
            await navigator.clipboard.writeText(state.targetHost);
            setCopiedTarget(true);
            setTimeout(() => setCopiedTarget(false), 1800);
        } catch {
            // Clipboard unavailable in restricted contexts.
        }
    };

    const badge = state.customDomainStatus === 'verified'
        ? <PanelStatusBadge label="Verificado" tone="success" />
        : state.customDomainStatus === 'pending'
          ? <PanelStatusBadge label="Pendiente DNS" tone="warning" />
          : state.customDomainStatus === 'error'
            ? <PanelStatusBadge label="DNS no detectado" tone="danger" />
            : null;

    return (
        <div id="agenda-custom-domain" className="scroll-mt-24">
            <PanelCard size="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--bg-subtle) text-(--fg)">
                            <IconGlobe size={18} aria-hidden="true" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight text-fg">Dominio propio</h2>
                                <PanelStatusBadge label="Pro+" tone="info" size="sm" />
                                {badge}
                            </div>
                            <p className="mt-1 text-sm text-fg-secondary">
                                Conecta tu propia dirección web (ej. <span className="font-medium text-fg">reservas.tunegocio.cl</span>) para que tus clientes agenden directo en tu dominio.
                            </p>
                        </div>
                    </div>
                </div>

                {!state.proPlusEligible ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-4">
                        <p className="text-sm text-fg-secondary">
                            Disponible en <span className="font-semibold text-fg">Pro+</span> con certificado SSL automático incluido.
                        </p>
                        <Link
                            href="/panel/mi-negocio/plan?plan=pro_plus"
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-(--accent) px-4 text-sm font-semibold text-(--accent-contrast) hover:opacity-90"
                        >
                            Mejorar a Pro+ <IconArrowRight size={15} aria-hidden="true" />
                        </Link>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
                        {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}

                        <form onSubmit={handleSave} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <PanelField label="Tu dominio o subdominio">
                                    <input
                                        id="agenda-custom-domain-input"
                                        type="text"
                                        value={domainInput}
                                        onChange={(e) => setDomainInput(e.target.value)}
                                        placeholder="reservas.tunegocio.cl"
                                        className="form-input w-full"
                                    />
                                </PanelField>
                            </div>
                            <PanelButton type="submit" disabled={saving || !domainInput.trim()}>
                                {saving ? <IconLoader2 size={15} className="animate-spin" aria-hidden="true" /> : null}
                                {state.customDomain ? 'Actualizar dominio' : 'Guardar dominio'}
                            </PanelButton>
                        </form>

                        {state.customDomain ? (
                            <div className="rounded-xl border border-(--border) bg-(--bg-subtle) p-4 text-sm">
                                <p className="font-semibold text-fg">Configura este registro en tu proveedor de dominio:</p>
                                <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                                    <div className="rounded-lg border border-(--border) bg-(--bg) px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Tipo</p>
                                        <p className="mt-0.5 font-mono text-xs font-semibold text-fg">CNAME</p>
                                    </div>
                                    <div className="rounded-lg border border-(--border) bg-(--bg) px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Nombre / Host</p>
                                        <p className="mt-0.5 truncate font-mono text-xs font-semibold text-fg">
                                            {extractDnsHostLabel(state.customDomain)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--bg) px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Destino / Valor</p>
                                            <p className="mt-0.5 truncate font-mono text-xs font-semibold text-fg">{state.targetHost}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => void handleCopyTarget()}
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-(--border) text-fg-secondary hover:text-fg"
                                            aria-label="Copiar destino DNS"
                                        >
                                            {copiedTarget ? <IconCheck size={14} aria-hidden="true" /> : <IconCopy size={14} aria-hidden="true" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <PanelButton type="button" onClick={() => void handleVerify()} disabled={verifying}>
                                            {verifying
                                                ? <IconLoader2 size={15} className="animate-spin" aria-hidden="true" />
                                                : <IconRefresh size={15} aria-hidden="true" />}
                                            {state.customDomainStatus === 'verified' ? 'Reverificar DNS' : 'Verificar DNS'}
                                        </PanelButton>
                                        {state.customDomainStatus === 'verified' ? (
                                            <a
                                                href={`https://${state.customDomain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-(--border) bg-(--bg) px-3.5 text-sm font-semibold text-fg hover:bg-(--bg-subtle)"
                                            >
                                                Abrir sitio <IconExternalLink size={14} aria-hidden="true" />
                                            </a>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleRemove()}
                                        disabled={removing}
                                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-fg-muted hover:text-(--danger)"
                                    >
                                        <IconTrash size={14} aria-hidden="true" /> Quitar dominio
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
