'use client';

import { useEffect, useState } from 'react';
import { AdminProtectedPage } from '@/components/admin-protected-page';
import { PanelCard, PanelNotice, PanelStatCard, PanelButton } from '@simple/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface SubscriptionView {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    vertical: 'autos' | 'propiedades' | 'agenda';
    planId: string;
    planName: string;
    status: 'active' | 'cancelled' | 'paused' | 'expired';
    providerStatus: string | null;
    startedAt: string;
    expiresAt: string | null;
    cancelledAt: string | null;
}

interface SubscriptionsResponse {
    ok: boolean;
    subscriptions?: SubscriptionView[];
    error?: string;
}

function getVerticalLabel(vertical: string): string {
    switch (vertical) {
        case 'autos': return 'SimpleAutos';
        case 'propiedades': return 'SimplePropiedades';
        case 'agenda': return 'SimpleAgenda';
        default: return vertical;
    }
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        active:    { label: 'Activa',     bg: 'rgba(34,197,94,0.12)',  color: 'rgb(34,197,94)' },
        cancelled: { label: 'Cancelada',  bg: 'rgba(244,63,94,0.12)',  color: 'rgb(244,63,94)' },
        paused:    { label: 'Pausada',    bg: 'rgba(234,179,8,0.12)',  color: 'rgb(234,179,8)' },
        expired:   { label: 'Expirada',   bg: 'var(--bg-muted)',       color: 'var(--fg-muted)' },
    };
    const cfg = map[status] ?? map.expired;
    return (
        <span
            className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium"
            style={{ background: cfg.bg, color: cfg.color }}
        >
            {cfg.label}
        </span>
    );
}

export default function SubscriptionsPage() {
    return (
        <AdminProtectedPage>
            {() => <SubscriptionsContent />}
        </AdminProtectedPage>
    );
}

function SubscriptionsContent() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [verticalFilter, setVerticalFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchSubscriptions = async () => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams();
        if (verticalFilter !== 'all') params.append('vertical', verticalFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        try {
            const res = await fetch(`${API_BASE}/api/subscriptions/admin/all?${params.toString()}`, { credentials: 'include' });
            const data: SubscriptionsResponse = await res.json();
            if (!data.ok) { setError(data.error || 'Error al cargar suscripciones'); return; }
            setSubscriptions(data.subscriptions || []);
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchSubscriptions(); }, [verticalFilter, statusFilter]);

    const total     = subscriptions.length;
    const active    = subscriptions.filter(s => s.status === 'active').length;
    const mkplace   = subscriptions.filter(s => s.vertical === 'autos' || s.vertical === 'propiedades').length;
    const agenda    = subscriptions.filter(s => s.vertical === 'agenda').length;

    return (
        <div className="container-app panel-page py-8">
            <div className="mb-6">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>Suscripciones</h1>
                <p className="type-page-subtitle mt-1">Gestión de suscripciones y pagos de todos los usuarios.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <PanelStatCard label="Total"       value={String(total)}   meta="Todas las verticals" />
                <PanelStatCard label="Activas"     value={String(active)}  meta="En curso" />
                <PanelStatCard label="Marketplace" value={String(mkplace)} meta="Autos + Propiedades" />
                <PanelStatCard label="Agenda"      value={String(agenda)}  meta="SimpleAgenda" />
            </div>

            <PanelCard size="md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>Todas las suscripciones</h2>
                        <p className="type-page-subtitle mt-1">Filtra por vertical o estado para revisar el historial de pagos.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--fg-muted)' }}>Vertical</label>
                            <select
                                value={verticalFilter}
                                onChange={(e) => setVerticalFilter(e.target.value)}
                                className="form-select h-10 text-sm"
                            >
                                <option value="all">Todas</option>
                                <option value="autos">SimpleAutos</option>
                                <option value="propiedades">SimplePropiedades</option>
                                <option value="agenda">SimpleAgenda</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--fg-muted)' }}>Estado</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-select h-10 text-sm"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activa</option>
                                <option value="cancelled">Cancelada</option>
                                <option value="paused">Pausada</option>
                                <option value="expired">Expirada</option>
                            </select>
                        </div>
                        <PanelButton variant="secondary" size="sm" className="h-10" onClick={() => void fetchSubscriptions()}>
                            Actualizar
                        </PanelButton>
                    </div>
                </div>

                {loading ? (
                    <PanelNotice tone="neutral">Cargando suscripciones...</PanelNotice>
                ) : error ? (
                    <PanelNotice tone="error">{error}</PanelNotice>
                ) : subscriptions.length === 0 ? (
                    <PanelNotice tone="neutral">No se encontraron suscripciones para ese filtro.</PanelNotice>
                ) : (
                    <div className="space-y-2">
                        {subscriptions.map((sub) => (
                            <article
                                key={sub.id}
                                className="rounded-xl border px-4 py-3"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div
                                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                        >
                                            {sub.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{sub.userName}</p>
                                                <StatusBadge status={sub.status} />
                                            </div>
                                            <p className="mt-0.5 text-xs break-all" style={{ color: 'var(--fg-secondary)' }}>{sub.userEmail}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 sm:gap-6 shrink-0">
                                        <SubMeta label="Vertical"  value={getVerticalLabel(sub.vertical)} />
                                        <SubMeta label="Plan"      value={sub.planName} />
                                        <SubMeta label="Inicio"    value={new Date(sub.startedAt).toLocaleDateString('es-CL')} />
                                        <SubMeta label="Expira"    value={sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('es-CL') : '—'} />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </PanelCard>
        </div>
    );
}

function SubMeta({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-20">
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}
