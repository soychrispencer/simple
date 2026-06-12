'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconShare,
    IconPlus,
    IconLoader2,
    IconCheck,
    IconX,
    IconUserPlus,
    IconTrash,
    IconAlertCircle,
    IconUsers,
    IconGift,
    IconCopy,
    IconExternalLink,
    IconArrowRight,
} from '@tabler/icons-react';
import {
    fetchAgendaReferrals,
    createAgendaReferral,
    patchAgendaReferral,
    deleteAgendaReferral,
    fetchAgendaClients,
    fetchAgendaProfile,
    type AgendaReferral,
    type ReferralStats,
    type ReferralStatus,
    type AgendaClient,
    type AgendaProfile,
} from '@/lib/agenda-api';
import { fmtDateMedium } from '@/lib/format';
import { Skeleton, SkeletonStat } from '@/components/panel/skeleton';
import { useEscapeClose } from '@/lib/use-modal-a11y';

const STATUS_LABELS: Record<ReferralStatus, string> = {
    pending: 'Pendiente',
    converted: 'Convertido',
    rewarded: 'Premiado',
    cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<ReferralStatus, string> = {
    pending: '#d97706',
    converted: 'var(--accent)',
    rewarded: '#6366F1',
    cancelled: '#9CA3AF',
};

function clientFullName(c: AgendaClient): string {
    return `${c.firstName}${c.lastName ? ' ' + c.lastName : ''}`.trim();
}

function platformReferralUrl(profile: AgendaProfile | null): string {
    const url = new URL('https://simpleagenda.app/');
    url.searchParams.set('utm_source', 'simpleagenda_panel');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'professional_recommendation');
    if (profile?.slug) url.searchParams.set('ref', profile.slug);
    return url.toString();
}

export default function ReferidosPage() {
    const [referrals, setReferrals] = useState<AgendaReferral[]>([]);
    const [stats, setStats] = useState<ReferralStats>({ total: 0, pending: 0, converted: 0, rewarded: 0 });
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [savingStatus, setSavingStatus] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState<'booking' | 'platform' | null>(null);

    const [form, setForm] = useState({
        referrerClientId: '',
        refereeName: '',
        refereePhone: '',
        rewardNote: '',
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const load = async () => {
        setLoading(true);
        const [refData, cls, agendaProfile] = await Promise.all([fetchAgendaReferrals(), fetchAgendaClients(), fetchAgendaProfile()]);
        setReferrals(refData.referrals);
        setStats(refData.stats);
        setClients(cls);
        setProfile(agendaProfile);
        setLoading(false);
    };

    useEffect(() => { void load(); }, []);

    useEscapeClose(showCreate, () => setShowCreate(false));
    useEscapeClose(confirmDeleteId !== null, () => setConfirmDeleteId(null));

    const activeClients = useMemo(
        () => clients.filter((c) => c.status === 'active').sort((a, b) => clientFullName(a).localeCompare(clientFullName(b))),
        [clients],
    );

    const conversionRate = stats.total > 0 ? Math.round(((stats.converted + stats.rewarded) / stats.total) * 100) : 0;
    const bookingUrl = profile?.slug ? `https://simpleagenda.app/${profile.slug}` : '';
    const platformUrl = platformReferralUrl(profile);

    const copyToClipboard = async (value: string, type: 'booking' | 'platform') => {
        await navigator.clipboard.writeText(value);
        setCopied(type);
        window.setTimeout(() => setCopied(null), 1800);
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!form.referrerClientId) { setCreateError('Selecciona el cliente que recomendó.'); return; }
        if (!form.refereeName.trim()) { setCreateError('Indica el nombre del referido.'); return; }
        setCreating(true);
        const res = await createAgendaReferral({
            referrerClientId: form.referrerClientId,
            refereeName: form.refereeName.trim(),
            refereePhone: form.refereePhone.trim() || undefined,
            rewardNote: form.rewardNote.trim() || undefined,
        });
        setCreating(false);
        if (!res.ok) { setCreateError(res.error ?? 'No se pudo crear.'); return; }
        setShowCreate(false);
        setForm({ referrerClientId: '', refereeName: '', refereePhone: '', rewardNote: '' });
        await load();
    };

    const handleStatusChange = async (r: AgendaReferral, next: ReferralStatus) => {
        setSavingStatus(r.id);
        setError('');
        const res = await patchAgendaReferral(r.id, { status: next });
        setSavingStatus(null);
        if (!res.ok) { setError(res.error ?? 'No se pudo actualizar.'); return; }
        await load();
    };

    const handleDelete = async (id: string) => {
        setSavingStatus(id);
        const res = await deleteAgendaReferral(id);
        setSavingStatus(null);
        setConfirmDeleteId(null);
        if (!res.ok) { setError(res.error ?? 'No se pudo eliminar.'); return; }
        await load();
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
                <Skeleton width={200} height="1.5rem" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
                </div>
                <Skeleton height="12rem" rounded="2xl" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
            <header className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Referidos</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Controla recomendaciones y comparte tus links.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    <IconPlus size={14} /> Registrar referido
                </button>
            </header>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total" value={String(stats.total)} icon={IconUsers} />
                <StatCard label="Pendientes" value={String(stats.pending)} icon={IconAlertCircle} tone="#d97706" />
                <StatCard label="Convertidos" value={String(stats.converted)} icon={IconCheck} tone="var(--accent)" />
                <StatCard label="Conversión" value={`${conversionRate}%`} icon={IconGift} />
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
                <div
                    className="rounded-2xl border p-4 md:p-5"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                                Recomendaciones
                            </p>
                            <h2 className="mt-1 text-base font-semibold" style={{ color: 'var(--fg)' }}>
                                Clientes que traen nuevos clientes
                            </h2>
                        </div>
                        <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                            <IconUserPlus size={18} />
                        </span>
                    </div>
                    <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        Beneficio definido por ti
                    </div>
                    <div className="grid gap-3">
                        {[
                            ['1', 'El cliente recomienda'],
                            ['2', 'Guardas el contacto'],
                            ['3', 'Si reserva, lo marcas premiado'],
                        ].map(([step, label]) => (
                            <div key={step} className="flex items-center gap-3">
                                <span
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                                >
                                    {step}
                                </span>
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        Registrar referido
                        <IconArrowRight size={14} />
                    </button>
                </div>

                <div
                    className="rounded-2xl border p-4 md:p-5"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                                SimpleAgenda
                            </p>
                            <h2 className="mt-1 text-base font-semibold" style={{ color: 'var(--fg)' }}>
                                Recomienda SimpleAgenda
                            </h2>
                        </div>
                        <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                            <IconShare size={18} />
                        </span>
                    </div>
                    <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        Tu link lleva tu código
                    </div>
                    <div className="mb-4 grid gap-3">
                        {[
                            ['1', 'Copias tu link'],
                            ['2', 'Lo compartes con colegas'],
                            ['3', 'El origen queda identificado'],
                        ].map(([step, label]) => (
                            <div key={step} className="flex items-center gap-3">
                                <span
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                                >
                                    {step}
                                </span>
                                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                    <div
                        className="rounded-xl border p-3 text-xs leading-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                    >
                        <span className="line-clamp-2 break-all">{platformUrl}</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => void copyToClipboard(platformUrl, 'platform')}
                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                        >
                            <IconCopy size={14} />
                            {copied === 'platform' ? 'Copiado' : 'Copiar link'}
                        </button>
                    </div>
                </div>
            </section>

            {bookingUrl ? (
                <section
                    className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Tu página pública de reservas</h2>
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--fg-muted)' }}>{bookingUrl}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void copyToClipboard(bookingUrl, 'booking')}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                        >
                            <IconCopy size={13} />
                            {copied === 'booking' ? 'Copiado' : 'Copiar'}
                        </button>
                        <a
                            href={bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                        >
                            <IconExternalLink size={13} />
                            Abrir
                        </a>
                    </div>
                </section>
            ) : null}

            {error ? (
                <div
                    role="alert"
                    className="rounded-xl border px-3 py-2 text-sm flex items-start gap-2"
                    style={{ borderColor: '#fecaca', background: 'color-mix(in srgb, #dc2626 6%, transparent)', color: '#991b1b' }}
                >
                    <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            <section
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                {referrals.length === 0 ? (
                    <div className="p-8 text-center">
                        <IconShare size={28} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
                        <p className="text-sm mb-1" style={{ color: 'var(--fg)' }}>Aún no hay referidos registrados.</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                            Registra el primer cliente que recomendó a alguien.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {referrals.map((r) => {
                            const referrerName = `${r.referrerFirstName ?? ''} ${r.referrerLastName ?? ''}`.trim() || '—';
                            return (
                                <li key={r.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] uppercase tracking-[0.04em]"
                                                style={{ background: STATUS_COLORS[r.status], color: '#fff' }}
                                            >
                                                {STATUS_LABELS[r.status]}
                                            </span>
                                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {fmtDateMedium(r.createdAt)}
                                            </span>
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--fg)' }}>
                                            <span style={{ color: 'var(--fg-muted)' }}>Refirió: </span>
                                            <strong>{referrerName}</strong>
                                            <span style={{ color: 'var(--fg-muted)' }}> → </span>
                                            <strong>{r.refereeName ?? '—'}</strong>
                                            {r.refereePhone ? (
                                                <span className="text-xs ml-2" style={{ color: 'var(--fg-muted)' }}>
                                                    · {r.refereePhone}
                                                </span>
                                            ) : null}
                                        </div>
                                        {r.rewardNote ? (
                                            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                                🎁 {r.rewardNote}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {r.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => void handleStatusChange(r, 'converted')}
                                                disabled={savingStatus === r.id}
                                                className="px-2.5 py-1.5 rounded-lg border text-xs transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                            >
                                                {savingStatus === r.id ? <IconLoader2 size={12} className="animate-spin inline" /> : 'Marcar convertido'}
                                            </button>
                                        )}
                                        {r.status === 'converted' && (
                                            <button
                                                type="button"
                                                onClick={() => void handleStatusChange(r, 'rewarded')}
                                                disabled={savingStatus === r.id}
                                                className="px-2.5 py-1.5 rounded-lg border text-xs transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                            >
                                                {savingStatus === r.id ? <IconLoader2 size={12} className="animate-spin inline" /> : 'Marcar premiado'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            aria-label="Eliminar referido"
                                            onClick={() => setConfirmDeleteId(r.id)}
                                            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-red-500/10 hover:border-red-500/40"
                                            style={{ borderColor: 'var(--border)', color: '#EF4444' }}
                                        >
                                            <IconTrash size={13} />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {showCreate ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Cerrar"
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        onClick={() => setShowCreate(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="referidos-create-title"
                        className="relative w-full max-w-md rounded-2xl border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h2 id="referidos-create-title" className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                                Registrar referido
                            </h2>
                            <button
                                type="button"
                                aria-label="Cerrar"
                                onClick={() => setShowCreate(false)}
                                className="w-8 h-8 rounded-lg border flex items-center justify-center"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                <IconX size={14} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    Cliente que recomendó
                                </label>
                                <select
                                    value={form.referrerClientId}
                                    onChange={(e) => setForm((p) => ({ ...p, referrerClientId: e.target.value }))}
                                    className="field-input"
                                >
                                    <option value="">Selecciona…</option>
                                    {activeClients.map((c) => (
                                        <option key={c.id} value={c.id}>{clientFullName(c)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    Nombre del referido
                                </label>
                                <input
                                    type="text"
                                    value={form.refereeName}
                                    onChange={(e) => setForm((p) => ({ ...p, refereeName: e.target.value }))}
                                    placeholder="Nombre completo"
                                    className="field-input"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    Teléfono <span className="normal-case" style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                                </label>
                                <input
                                    type="tel"
                                    value={form.refereePhone}
                                    onChange={(e) => setForm((p) => ({ ...p, refereePhone: e.target.value }))}
                                    placeholder="+56 9 1234 5678"
                                    className="field-input"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    Beneficio ofrecido <span className="normal-case" style={{ color: 'var(--fg-muted)' }}>(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.rewardNote}
                                    onChange={(e) => setForm((p) => ({ ...p, rewardNote: e.target.value }))}
                                    placeholder="Ej: 20% de descuento en siguiente cita"
                                    className="field-input"
                                />
                            </div>

                            {createError ? (
                                <div
                                    className="text-xs px-3 py-2 rounded-lg border"
                                    style={{ borderColor: '#fecaca', background: 'color-mix(in srgb, #dc2626 6%, transparent)', color: '#991b1b' }}
                                >
                                    {createError}
                                </div>
                            ) : null}

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => void handleCreate()}
                                    disabled={creating}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                    style={{ background: 'var(--accent)', color: '#fff' }}
                                >
                                    {creating ? <IconLoader2 size={13} className="animate-spin" /> : <IconUserPlus size={13} />}
                                    {creating ? 'Guardando…' : 'Guardar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2.5 rounded-xl border text-sm"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {confirmDeleteId ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Cerrar"
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        onClick={() => setConfirmDeleteId(null)}
                    />
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="referidos-delete-title"
                        className="relative w-full max-w-sm rounded-2xl border p-5"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <h2 id="referidos-delete-title" className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                            Eliminar referido
                        </h2>
                        <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => void handleDelete(confirmDeleteId)}
                                disabled={savingStatus === confirmDeleteId}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                                style={{ background: '#EF4444', color: '#fff' }}
                            >
                                {savingStatus === confirmDeleteId ? <IconLoader2 size={13} className="animate-spin inline" /> : 'Eliminar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 rounded-xl border text-sm"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    tone = 'var(--fg)',
}: {
    label: string;
    value: string;
    icon: typeof IconShare;
    tone?: string;
}) {
    return (
        <div
            className="p-4 rounded-2xl border"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                <span
                    className="w-7 h-7 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                >
                    <Icon size={14} stroke={1.8} />
                </span>
            </div>
            <div className="text-xl font-semibold" style={{ color: tone }}>{value}</div>
        </div>
    );
}
