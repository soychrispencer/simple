'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { PanelCard, PanelNotice, PanelStatCard, PanelButton } from '@simple/ui';
import type { AdminSessionUser } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Types ────────────────────────────────────────────────────────────────────

interface AgendaSub {
    profileId: string;
    userId: string;
    userName: string;
    userEmail: string;
    displayName: string;
    slug: string;
    plan: 'free' | 'pro';
    planExpiresAt: string | null;
    isPublished: boolean;
    status: 'active' | 'expired' | 'free';
    createdAt: string;
}

interface SetPlanPayload {
    profileId: string;
    plan: 'free' | 'pro';
    expiresAt: string | null;
    notes: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        active:  { label: 'Pro activo', bg: 'rgba(34,197,94,0.12)',  color: 'rgb(21,128,61)' },
        expired: { label: 'Expirado',   bg: 'rgba(244,63,94,0.12)',  color: 'rgb(190,18,60)' },
        free:    { label: 'Gratuito',   bg: 'var(--bg-muted)',       color: 'var(--fg-muted)' },
    };
    const cfg = map[status] ?? map.free;
    return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </span>
    );
}

function SubMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-[4rem]">
            <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

// ── Set-plan modal ────────────────────────────────────────────────────────────

function SetPlanModal({ sub, onClose, onSaved }: { sub: AgendaSub; onClose: () => void; onSaved: () => void }) {
    const [plan, setPlan] = useState<'free' | 'pro'>(sub.plan);
    const [expiresAt, setExpiresAt] = useState<string>(
        sub.planExpiresAt ? sub.planExpiresAt.slice(0, 10) : '',
    );
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        const payload: SetPlanPayload = {
            profileId: sub.profileId,
            plan,
            expiresAt: plan === 'pro' && expiresAt ? expiresAt : null,
            notes,
        };
        try {
            const res = await fetch(`${API_BASE}/api/admin/agenda/set-plan`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json() as { ok: boolean; error?: string };
            if (!data.ok) { setError(data.error ?? 'Error al guardar'); setSaving(false); return; }
            onSaved();
        } catch {
            setError('Error de conexión');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>Gestionar plan</h2>
                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                    {sub.displayName || sub.userName} · <span className="font-mono">{sub.userEmail}</span>
                </p>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>Plan</label>
                        <div className="flex gap-2">
                            {(['free', 'pro'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlan(p)}
                                    className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors"
                                    style={{
                                        borderColor: plan === p ? 'var(--accent)' : 'var(--border)',
                                        background: plan === p ? 'var(--accent-soft)' : 'var(--bg)',
                                        color: plan === p ? 'var(--accent)' : 'var(--fg-muted)',
                                    }}
                                >
                                    {p === 'pro' ? 'Profesional' : 'Gratuito'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {plan === 'pro' && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Fecha de expiración <span style={{ color: 'var(--fg-muted)' }}>(opcional — sin fecha = indefinido)</span>
                            </label>
                            <input
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="form-input w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>Nota interna (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Plan de prueba 30 días, o soporte manual"
                            rows={2}
                            className="form-textarea w-full"
                        />
                    </div>

                    {error && <p className="text-xs" style={{ color: 'rgb(190,18,60)' }}>{error}</p>}

                    <div className="flex gap-2 pt-1">
                        <PanelButton variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
                            Cancelar
                        </PanelButton>
                        <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving} className="flex-1">
                            {saving ? 'Guardando...' : 'Guardar'}
                        </PanelButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Confirm cancel modal ──────────────────────────────────────────────────────

function CancelPlanModal({ sub, onClose, onCancelled }: { sub: AgendaSub; onClose: () => void; onCancelled: () => void }) {
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState('');

    const handleCancel = async () => {
        setCancelling(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/agenda/cancel-plan`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: sub.profileId }),
            });
            const data = await res.json() as { ok: boolean; error?: string };
            if (!data.ok) { setError(data.error ?? 'Error'); setCancelling(false); return; }
            onCancelled();
        } catch {
            setError('Error de conexión');
            setCancelling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>¿Cancelar plan Pro?</h2>
                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                    Esto revierte a <strong>Gratuito</strong> a <strong>{sub.displayName || sub.userName}</strong> de inmediato.
                </p>
                {error && <p className="text-xs mb-3" style={{ color: 'rgb(190,18,60)' }}>{error}</p>}
                <div className="flex gap-2">
                    <PanelButton variant="secondary" onClick={onClose} disabled={cancelling} className="flex-1">Volver</PanelButton>
                    <PanelButton variant="secondary" onClick={() => void handleCancel()} disabled={cancelling} className="flex-1" style={{ background: 'rgba(244,63,94,0.1)', color: 'rgb(190,18,60)', border: '1px solid rgba(244,63,94,0.3)' }}>
                        {cancelling ? 'Cancelando...' : 'Confirmar cancelación'}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}

// ── Agenda subscriptions table ───────────────────────────────────────────────

function AgendaSubscriptionsSection() {
    const [subs, setSubs] = useState<AgendaSub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [editSub, setEditSub] = useState<AgendaSub | null>(null);
    const [cancelSub, setCancelSub] = useState<AgendaSub | null>(null);

    const fetchSubs = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/agenda/subscriptions`, { credentials: 'include' });
            const data = await res.json() as { ok: boolean; subscriptions?: AgendaSub[]; error?: string };
            if (!data.ok) { setError(data.error ?? 'Error'); return; }
            setSubs(data.subscriptions ?? []);
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchSubs(); }, [fetchSubs]);

    const filtered = subs.filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q);
        }
        return true;
    });

    const countPro = subs.filter((s) => s.status === 'active').length;
    const countFree = subs.filter((s) => s.status === 'free').length;
    const countExp = subs.filter((s) => s.status === 'expired').length;

    return (
        <>
            {editSub && (
                <SetPlanModal
                    sub={editSub}
                    onClose={() => setEditSub(null)}
                    onSaved={() => { setEditSub(null); void fetchSubs(); }}
                />
            )}
            {cancelSub && (
                <CancelPlanModal
                    sub={cancelSub}
                    onClose={() => setCancelSub(null)}
                    onCancelled={() => { setCancelSub(null); void fetchSubs(); }}
                />
            )}

            <div className="grid grid-cols-3 gap-3 mb-5">
                <PanelStatCard label="Pro activo" value={String(countPro)} meta="SimpleAgenda" />
                <PanelStatCard label="Gratuito"   value={String(countFree)} meta="SimpleAgenda" />
                <PanelStatCard label="Expirado"   value={String(countExp)} meta="SimpleAgenda" />
            </div>

            <PanelCard size="md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Planes SimpleAgenda</h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Gestión manual de planes — solo superadmin.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar usuario, email, slug..."
                            className="form-input h-9 text-sm w-52"
                        />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select h-9 text-sm">
                            <option value="all">Todos</option>
                            <option value="active">Pro activo</option>
                            <option value="expired">Expirado</option>
                            <option value="free">Gratuito</option>
                        </select>
                        <PanelButton variant="secondary" size="sm" className="h-9" onClick={() => void fetchSubs()}>↺ Actualizar</PanelButton>
                    </div>
                </div>

                {loading ? (
                    <PanelNotice tone="neutral">Cargando...</PanelNotice>
                ) : error ? (
                    <PanelNotice tone="error">{error}</PanelNotice>
                ) : filtered.length === 0 ? (
                    <PanelNotice tone="neutral">Sin resultados.</PanelNotice>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((sub) => (
                            <article key={sub.profileId} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            {(sub.displayName || sub.userName).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{sub.displayName || sub.userName}</p>
                                                <StatusBadge status={sub.status} />
                                            </div>
                                            <p className="mt-0.5 text-xs break-all" style={{ color: 'var(--fg-muted)' }}>{sub.userEmail} · /{sub.slug}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <SubMeta label="Plan" value={sub.plan === 'pro' ? 'Profesional' : 'Gratuito'} />
                                        <SubMeta label="Expira" value={fmtDate(sub.planExpiresAt)} />
                                        <SubMeta label="Desde" value={fmtDate(sub.createdAt)} />
                                        <div className="flex gap-2">
                                            <PanelButton variant="secondary" size="sm" onClick={() => setEditSub(sub)}>
                                                Editar plan
                                            </PanelButton>
                                            {sub.plan === 'pro' && (
                                                <PanelButton variant="secondary" size="sm" onClick={() => setCancelSub(sub)} style={{ color: 'rgb(190,18,60)', borderColor: 'rgba(244,63,94,0.3)' }}>
                                                    Cancelar
                                                </PanelButton>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}

// ── Marketplace subscription section (per-vertical) ──────────────────────────

interface MktSub {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    vertical: 'autos' | 'propiedades';
    planId: string;
    planName: string;
    status: string;
    startedAt: string;
    expiresAt: string | null;
    cancelledAt: string | null;
}

const MKT_PLANS = [
    { id: 'free',       label: 'Gratuito' },
    { id: 'basic',      label: 'Básico' },
    { id: 'pro',        label: 'Profesional' },
    { id: 'enterprise', label: 'Empresarial' },
];

const VERTICAL_LABEL: Record<string, string> = {
    autos: 'SimpleAutos',
    propiedades: 'SimplePropiedades',
};

function SetMktPlanModal({ sub, onClose, onSaved }: { sub: MktSub; onClose: () => void; onSaved: () => void }) {
    const [planId, setPlanId] = useState(sub.planId);
    const [expiresAt, setExpiresAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/admin/subscriptions/set-plan`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: sub.userId, vertical: sub.vertical, planId, expiresAt: expiresAt || null }),
            });
            const data = await res.json() as { ok: boolean; error?: string };
            if (!data.ok) { setError(data.error ?? 'Error'); setSaving(false); return; }
            onSaved();
        } catch { setError('Error de conexión'); setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h2 className="text-base font-semibold mb-0.5" style={{ color: 'var(--fg)' }}>Gestionar plan</h2>
                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                    {sub.userName} · <span className="font-mono">{sub.userEmail}</span>
                    <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        {VERTICAL_LABEL[sub.vertical] ?? sub.vertical}
                    </span>
                </p>
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>Plan</label>
                        <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="form-select w-full">
                            {MKT_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                    {planId !== 'free' && (
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                                Fecha de expiración <span style={{ color: 'var(--fg-muted)' }}>(vacío = 1 año)</span>
                            </label>
                            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="form-input w-full" />
                        </div>
                    )}
                    {error && <p className="text-xs" style={{ color: 'rgb(190,18,60)' }}>{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <PanelButton variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancelar</PanelButton>
                        <PanelButton variant="accent" onClick={() => void handleSave()} disabled={saving} className="flex-1">
                            {saving ? 'Guardando...' : 'Guardar'}
                        </PanelButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VerticalSubscriptionsSection({ vertical }: { vertical: 'autos' | 'propiedades' }) {
    const [subs, setSubs] = useState<MktSub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [editSub, setEditSub] = useState<MktSub | null>(null);

    const fetchSubs = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ vertical });
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const res = await fetch(`${API_BASE}/api/subscriptions/admin/all?${params.toString()}`, { credentials: 'include' });
            const data = await res.json() as { ok: boolean; subscriptions?: MktSub[]; error?: string };
            if (!data.ok) { setError(data.error ?? 'Error'); return; }
            setSubs(data.subscriptions ?? []);
        } catch { setError('Error de conexión'); } finally { setLoading(false); }
    }, [vertical, statusFilter]);

    useEffect(() => { void fetchSubs(); }, [fetchSubs]);

    const filtered = subs.filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.userName.toLowerCase().includes(q) || s.userEmail.toLowerCase().includes(q);
    });

    const countActive    = subs.filter((s) => s.status === 'active').length;
    const countCancelled = subs.filter((s) => s.status === 'cancelled').length;
    const countPaused    = subs.filter((s) => s.status === 'paused').length;
    const verticalName   = VERTICAL_LABEL[vertical] ?? vertical;

    return (
        <>
            {editSub && (
                <SetMktPlanModal
                    sub={editSub}
                    onClose={() => setEditSub(null)}
                    onSaved={() => { setEditSub(null); void fetchSubs(); }}
                />
            )}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <PanelStatCard label="Activas"    value={String(countActive)}    meta={verticalName} />
                <PanelStatCard label="Canceladas" value={String(countCancelled)} meta={verticalName} />
                <PanelStatCard label="Pausadas"   value={String(countPaused)}    meta={verticalName} />
            </div>
            <PanelCard size="md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Planes {verticalName}</h2>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Gestión manual de suscripciones — solo superadmin.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuario..." className="form-input h-9 text-sm w-44" />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select h-9 text-sm">
                            <option value="all">Todos</option>
                            <option value="active">Activa</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="paused">Pausada</option>
                        </select>
                        <PanelButton variant="secondary" size="sm" className="h-9" onClick={() => void fetchSubs()}>↺ Actualizar</PanelButton>
                    </div>
                </div>
                {loading ? (
                    <PanelNotice tone="neutral">Cargando...</PanelNotice>
                ) : error ? (
                    <PanelNotice tone="error">{error}</PanelNotice>
                ) : filtered.length === 0 ? (
                    <PanelNotice tone="neutral">Sin suscripciones registradas.</PanelNotice>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((sub) => (
                            <article key={sub.id} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            {sub.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{sub.userName}</p>
                                                <MktStatusBadge status={sub.status} />
                                            </div>
                                            <p className="mt-0.5 text-xs break-all" style={{ color: 'var(--fg-muted)' }}>{sub.userEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <SubMeta label="Plan"   value={sub.planName} />
                                        <SubMeta label="Inicio" value={fmtDate(sub.startedAt)} />
                                        <SubMeta label="Expira" value={fmtDate(sub.expiresAt)} />
                                        <PanelButton variant="secondary" size="sm" onClick={() => setEditSub(sub)}>Editar plan</PanelButton>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}

function MktStatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        active:    { label: 'Activa',    bg: 'rgba(34,197,94,0.12)',  color: 'rgb(21,128,61)' },
        cancelled: { label: 'Cancelada', bg: 'rgba(244,63,94,0.12)',  color: 'rgb(190,18,60)' },
        paused:    { label: 'Pausada',   bg: 'rgba(234,179,8,0.12)',  color: 'rgb(161,98,7)' },
    };
    const cfg = map[status] ?? { label: status, bg: 'var(--bg-muted)', color: 'var(--fg-muted)' };
    return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </span>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
    return (
        <AdminProtectedPage>
            {(user) => <SubscriptionsContent user={user} />}
        </AdminProtectedPage>
    );
}

type Tab = 'agenda' | 'autos' | 'propiedades';

const TABS: { key: Tab; label: string }[] = [
    { key: 'agenda',       label: 'SimpleAgenda' },
    { key: 'autos',        label: 'SimpleAutos' },
    { key: 'propiedades',  label: 'SimplePropiedades' },
];

function SubscriptionsContent({ user }: { user: AdminSessionUser }) {
    const isSuperAdmin = user.role === 'superadmin';
    const [tab, setTab] = useState<Tab>('agenda');

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Suscripciones</h1>
                <p className="type-page-subtitle mt-1">Gestión manual de planes para todas las verticales.</p>
            </div>

            {!isSuperAdmin ? (
                <PanelNotice tone="neutral">Solo el superadmin puede gestionar planes de suscripción.</PanelNotice>
            ) : (
                <>
                    <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-muted)' }}>
                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    background: tab === key ? 'var(--surface)' : 'transparent',
                                    color: tab === key ? 'var(--fg)' : 'var(--fg-muted)',
                                    boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {tab === 'agenda'      && <AgendaSubscriptionsSection />}
                    {tab === 'autos'       && <VerticalSubscriptionsSection vertical="autos" />}
                    {tab === 'propiedades' && <VerticalSubscriptionsSection vertical="propiedades" />}
                </>
            )}
        </div>
    );
}
