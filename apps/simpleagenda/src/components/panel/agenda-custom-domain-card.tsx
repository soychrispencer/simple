'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconCopy, IconEdit, IconExternalLink, IconLoader2, IconRefresh, IconTrash } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelNotice, PanelStatusBadge } from '@simple/ui/panel';
import {
    deleteAgendaCustomDomain,
    fetchAgendaCustomDomain,
    hasAgendaProPlusAccess,
    saveAgendaCustomDomain,
    verifyAgendaCustomDomain,
    type AgendaCustomDomainState,
    type AgendaProfile,
} from '@/lib/agenda-api';

const MULTI_PART_TLDS = new Set([
    'com.ar', 'com.br', 'com.co', 'com.mx', 'com.pe', 'com.uy', 'com.ve', 'com.ec',
    'co.uk', 'org.uk', 'org.cl', 'gob.cl', 'net.cl',
]);

function parseDnsSetup(domain: string, targetHost: string, targetIp?: string | null): {
    isRoot: boolean;
    recordType: 'A' | 'CNAME';
    hostLabel: string;
    value: string;
} {
    const parts = domain.toLowerCase().split('.').filter(Boolean);
    const lastTwo = parts.slice(-2).join('.');
    const rootPartsCount = MULTI_PART_TLDS.has(lastTwo) ? 3 : 2;
    const isRoot = parts.length <= rootPartsCount;

    if (isRoot && targetIp) {
        return {
            isRoot: true,
            recordType: 'A',
            hostLabel: '@',
            value: targetIp,
        };
    }

    return {
        isRoot,
        recordType: 'CNAME',
        hostLabel: isRoot ? '@' : parts.slice(0, -rootPartsCount).join('.'),
        value: targetHost,
    };
}

export function AgendaCustomDomainCard({ profile }: { profile: AgendaProfile }) {
    const [state, setState] = useState<AgendaCustomDomainState>({
        customDomain: profile.customDomain ?? null,
        customDomainStatus: profile.customDomainStatus ?? 'none',
        customDomainVerifiedAt: profile.customDomainVerifiedAt ?? null,
        targetHost: 'simpleagenda.app',
        targetIp: null,
        proPlusEligible: hasAgendaProPlusAccess(profile),
    });
    const [domainInput, setDomainInput] = useState(profile.customDomain ?? '');
    const [editing, setEditing] = useState(profile.customDomainStatus !== 'verified');
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
                setEditing(data.customDomainStatus !== 'verified');
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
                targetIp: res.targetIp ?? prev.targetIp,
            }));
            setDomainInput(res.customDomain ?? domainInput.trim().toLowerCase());
            setEditing(true);
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
            setEditing(false);
            setMessage('Dominio verificado y activo con SSL.');
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
            setEditing(true);
            setMessage('Dominio desconectado.');
        } finally {
            setRemoving(false);
        }
    };

    const dnsSetup = state.customDomain
        ? parseDnsSetup(state.customDomain, state.targetHost, state.targetIp)
        : null;

    const handleCopyTarget = async () => {
        if (!dnsSetup) return;
        try {
            await navigator.clipboard.writeText(dnsSetup.value);
            setCopiedTarget(true);
            setTimeout(() => setCopiedTarget(false), 1800);
        } catch {
            // Clipboard unavailable in restricted contexts.
        }
    };

    const isVerified = state.customDomainStatus === 'verified' && Boolean(state.customDomain);
    const badge = isVerified
        ? <PanelStatusBadge label="Activo" tone="success" size="sm" />
        : state.customDomainStatus === 'pending'
          ? <PanelStatusBadge label="Pendiente DNS" tone="warning" size="sm" />
          : state.customDomainStatus === 'error'
            ? <PanelStatusBadge label="DNS no detectado" tone="danger" size="sm" />
            : null;

    return (
        <div id="agenda-custom-domain" className="scroll-mt-24">
            <PanelCard size="sm">
                {!state.proPlusEligible ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-medium text-fg">Dominio propio</h2>
                                <PanelStatusBadge label="Pro+" tone="info" size="sm" />
                            </div>
                            <p className="mt-0.5 text-xs text-fg-secondary">
                                Conecta tu propia URL (ej. <span className="font-medium text-fg">reservas.tunegocio.cl</span>) con SSL automático.
                            </p>
                        </div>
                        <Link
                            href="/panel/mi-negocio/plan?plan=pro_plus"
                            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-(--accent) px-3.5 text-xs font-semibold text-(--accent-contrast) hover:opacity-90"
                        >
                            Mejorar a Pro+ <IconArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-sm font-medium text-fg">Dominio propio</h2>
                                <PanelStatusBadge label="Pro+" tone="info" size="sm" />
                            </div>
                            {badge}
                        </div>

                        {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
                        {message ? <PanelNotice tone="success">{message}</PanelNotice> : null}

                        {isVerified && !editing ? (
                            <>
                                <div className="flex items-center justify-between gap-2 rounded-xl border border-(--border) bg-(--bg-subtle) px-3 py-2">
                                    <span className="min-w-0 truncate text-xs sm:text-sm font-medium text-fg">
                                        https://{state.customDomain}
                                    </span>
                                    <a
                                        href={`https://${state.customDomain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-(--accent) px-2.5 text-xs font-semibold text-(--accent-contrast) transition-opacity hover:opacity-90"
                                    >
                                        Abrir <IconExternalLink size={13} aria-hidden="true" />
                                    </a>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-secondary transition-colors hover:text-fg"
                                    >
                                        <IconEdit size={14} aria-hidden="true" /> Cambiar dominio
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleRemove()}
                                        disabled={removing}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-(--danger)"
                                    >
                                        <IconTrash size={14} aria-hidden="true" /> Quitar
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                            id="agenda-custom-domain-input"
                                            type="text"
                                            aria-label="Dominio propio"
                                            value={domainInput}
                                            onChange={(e) => setDomainInput(e.target.value)}
                                            placeholder="reservas.tunegocio.cl"
                                            className="form-input h-10 min-w-0 flex-1 text-sm"
                                        />
                                        <PanelButton type="submit" size="sm" disabled={saving || !domainInput.trim()}>
                                            {saving ? <IconLoader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                                            {state.customDomain ? 'Actualizar' : 'Guardar'}
                                        </PanelButton>
                                    </form>
                                    {!state.customDomain ? (
                                        <p className="text-[11px] text-fg-muted">
                                            Recomendado: usa un subdominio como <span className="font-medium text-fg-secondary">reservas.tunegocio.cl</span> para no afectar tu correo ni tu web actual.
                                        </p>
                                    ) : null}
                                </div>

                                {dnsSetup ? (
                                    <div className="space-y-1.5 rounded-xl border border-(--border) bg-(--bg-subtle) px-3 py-2 text-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-fg-secondary">
                                                <span className="rounded bg-(--bg) px-1.5 py-0.5 font-mono font-semibold text-fg">
                                                    {dnsSetup.recordType}
                                                </span>
                                                <span className="font-mono font-semibold text-fg">{dnsSetup.hostLabel}</span>
                                                <span aria-hidden="true">→</span>
                                                <span className="truncate font-mono font-semibold text-fg">{dnsSetup.value}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCopyTarget()}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-(--border) bg-(--bg) text-fg-secondary hover:text-fg"
                                                    aria-label="Copiar destino DNS"
                                                >
                                                    {copiedTarget ? <IconCheck size={12} aria-hidden="true" /> : <IconCopy size={12} aria-hidden="true" />}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <PanelButton type="button" size="sm" variant="secondary" onClick={() => void handleVerify()} disabled={verifying}>
                                                    {verifying
                                                        ? <IconLoader2 size={13} className="animate-spin" aria-hidden="true" />
                                                        : <IconRefresh size={13} aria-hidden="true" />}
                                                    Verificar DNS
                                                </PanelButton>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemove()}
                                                    disabled={removing}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-(--bg) hover:text-(--danger)"
                                                    aria-label="Quitar dominio"
                                                    title="Quitar dominio"
                                                >
                                                    <IconTrash size={14} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-fg-muted">
                                            Copia este registro en tu proveedor de dominio y pulsa Verificar DNS (tarda 5–30 min).
                                        </p>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
