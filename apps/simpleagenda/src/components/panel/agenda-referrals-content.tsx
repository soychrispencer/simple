'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    IconPlus,
    IconLoader2,
    IconCheck,
    IconUserPlus,
    IconTrash,
    IconAlertCircle,
    IconUsers,
    IconGift,
    IconCopy,
    IconExternalLink,
} from '@tabler/icons-react';
import { AgendaScrollModal } from '@/components/panel/agenda-scroll-modal';
import {
    PanelAccountShell,
    PanelBlockHeader,
    PanelButton,
    PanelCard,
    PanelConfirmDialog,
    PanelEmptyState,
    PanelField,
    PanelNotice,
    PanelStatCard,
    PanelStatusBadge,
    ACCOUNT_REFERRALS_PAGE,
} from '@simple/ui/panel';
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
import { usePanelFormatters } from '@simple/auth';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';
import { useEscapeClose } from '@/lib/use-modal-a11y';

const STATUS_LABELS: Record<ReferralStatus, string> = {
    pending: 'Pendiente',
    converted: 'Convertido',
    rewarded: 'Premiado',
    cancelled: 'Cancelado',
};

const STATUS_TONE: Record<ReferralStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
    pending: 'warning',
    converted: 'info',
    rewarded: 'success',
    cancelled: 'neutral',
};

function clientFullName(c: AgendaClient): string {
    return `${c.firstName}${c.lastName ? ` ${c.lastName}` : ''}`.trim();
}

function platformReferralUrl(profile: AgendaProfile | null): string {
    const url = new URL('https://simpleagenda.app/');
    url.searchParams.set('utm_source', 'simpleagenda_panel');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'professional_recommendation');
    if (profile?.slug) url.searchParams.set('ref', profile.slug);
    return url.toString();
}

export function AgendaReferralsContent() {
    const fmt = usePanelFormatters();
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
        const [refData, cls, agendaProfile] = await Promise.all([
            fetchAgendaReferrals(),
            fetchAgendaClients(),
            fetchAgendaProfile(),
        ]);
        setReferrals(refData.referrals);
        setStats(refData.stats);
        setClients(cls);
        setProfile(agendaProfile);
        setLoading(false);
    };

    useEffect(() => { void load(); }, []);

    useEscapeClose(showCreate, () => setShowCreate(false));

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
        if (!form.referrerClientId) { setCreateError('Selecciona el paciente que recomendó.'); return; }
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
            <PanelAccountShell
                activeKey="referidos"
                tabs={accountSectionTabs}
                title={ACCOUNT_REFERRALS_PAGE.title}
                description={ACCOUNT_REFERRALS_PAGE.description}
            >
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={16} className="animate-spin" aria-hidden />
                    Cargando referidos...
                </div>
            </PanelAccountShell>
        );
    }

    return (
        <PanelAccountShell
            activeKey="referidos"
            tabs={accountSectionTabs}
            title={ACCOUNT_REFERRALS_PAGE.title}
            description={ACCOUNT_REFERRALS_PAGE.description}
            actions={
                <PanelButton variant="accent" size="sm" onClick={() => setShowCreate(true)}>
                    <IconPlus size={15} />
                    Registrar referido
                </PanelButton>
            }
        >
            <PanelNotice tone="neutral">
                Herramienta opcional para premiar pacientes que te traen nuevos contactos. El beneficio lo defines tú; Simple no interviene en el premio.
            </PanelNotice>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <PanelStatCard label="Total" value={String(stats.total)} icon={<IconUsers size={16} />} />
                <PanelStatCard label="Pendientes" value={String(stats.pending)} icon={<IconAlertCircle size={16} />} />
                <PanelStatCard label="Convertidos" value={String(stats.converted)} icon={<IconCheck size={16} />} />
                <PanelStatCard label="Conversión" value={`${conversionRate}%`} icon={<IconGift size={16} />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Recomendaciones de pacientes"
                        description="Registra quién refirió a quién y marca el estado cuando reserve."
                        className="mb-4"
                    />
                    <ol className="mb-4 space-y-2 text-sm text-fg-secondary">
                        <li>1. Un paciente te recomienda a alguien</li>
                        <li>2. Guardas el contacto aquí</li>
                        <li>3. Si agenda, lo marcas convertido o premiado</li>
                    </ol>
                    <PanelButton variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
                        <IconUserPlus size={14} />
                        Registrar referido
                    </PanelButton>
                </PanelCard>

                <PanelCard size="md">
                    <PanelBlockHeader
                        title="Invita colegas a SimpleAgenda"
                        description="Tu link identifica el origen si un colega se registra."
                        className="mb-4"
                    />
                    <p className="mb-3 truncate rounded-xl border border-border bg-(--bg-subtle) px-3 py-2 text-xs text-fg-muted">
                        {platformUrl}
                    </p>
                    <PanelButton variant="secondary" size="sm" onClick={() => void copyToClipboard(platformUrl, 'platform')}>
                        <IconCopy size={14} />
                        {copied === 'platform' ? 'Copiado' : 'Copiar link'}
                    </PanelButton>
                </PanelCard>
            </div>

            {bookingUrl ? (
                <PanelCard size="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg">Tu página de reservas</p>
                        <p className="mt-0.5 truncate text-xs text-fg-muted">{bookingUrl}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <PanelButton variant="secondary" size="sm" onClick={() => void copyToClipboard(bookingUrl, 'booking')}>
                            <IconCopy size={14} />
                            {copied === 'booking' ? 'Copiado' : 'Copiar'}
                        </PanelButton>
                        <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                            <PanelButton variant="secondary" size="sm" type="button">
                                <IconExternalLink size={14} />
                                Abrir
                            </PanelButton>
                        </a>
                    </div>
                </PanelCard>
            ) : null}

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            <PanelCard size="md" className="overflow-hidden p-0">
                <PanelBlockHeader title="Registro de referidos" className="px-5 pt-5 pb-0" />
                {referrals.length === 0 ? (
                    <div className="p-6">
                        <PanelEmptyState
                            title="Sin referidos aún"
                            description="Cuando un paciente te recomiende a alguien, regístralo aquí para hacer seguimiento."
                        />
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {referrals.map((r) => {
                            const referrerName = `${r.referrerFirstName ?? ''} ${r.referrerLastName ?? ''}`.trim() || '—';
                            return (
                                <li key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                            <PanelStatusBadge label={STATUS_LABELS[r.status]} tone={STATUS_TONE[r.status]} />
                                            <span className="text-xs text-fg-muted">{fmt.dateMedium(r.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-fg">
                                            <span className="text-fg-muted">Refirió: </span>
                                            <strong>{referrerName}</strong>
                                            <span className="text-fg-muted"> → </span>
                                            <strong>{r.refereeName ?? '—'}</strong>
                                            {r.refereePhone ? (
                                                <span className="ml-2 text-xs text-fg-muted">· {r.refereePhone}</span>
                                            ) : null}
                                        </p>
                                        {r.rewardNote ? (
                                            <p className="mt-1 text-xs text-fg-muted">Beneficio: {r.rewardNote}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {r.status === 'pending' ? (
                                            <PanelButton
                                                variant="secondary"
                                                size="sm"
                                                disabled={savingStatus === r.id}
                                                onClick={() => void handleStatusChange(r, 'converted')}
                                            >
                                                {savingStatus === r.id ? <IconLoader2 size={12} className="animate-spin" /> : 'Convertido'}
                                            </PanelButton>
                                        ) : null}
                                        {r.status === 'converted' ? (
                                            <PanelButton
                                                variant="secondary"
                                                size="sm"
                                                disabled={savingStatus === r.id}
                                                onClick={() => void handleStatusChange(r, 'rewarded')}
                                            >
                                                {savingStatus === r.id ? <IconLoader2 size={12} className="animate-spin" /> : 'Premiado'}
                                            </PanelButton>
                                        ) : null}
                                        <PanelButton
                                            variant="secondary"
                                            size="sm"
                                            aria-label="Eliminar referido"
                                            onClick={() => setConfirmDeleteId(r.id)}
                                        >
                                            <IconTrash size={14} />
                                        </PanelButton>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </PanelCard>

            {showCreate ? (
                <AgendaScrollModal
                    title="Registrar referido"
                    size="md"
                    onClose={() => setShowCreate(false)}
                    footer={(
                        <div className="flex gap-2">
                            <PanelButton variant="accent" className="flex-1" disabled={creating} onClick={() => void handleCreate()}>
                                {creating ? <IconLoader2 size={14} className="animate-spin" /> : <IconUserPlus size={14} />}
                                Guardar
                            </PanelButton>
                            <PanelButton variant="secondary" onClick={() => setShowCreate(false)}>
                                Cancelar
                            </PanelButton>
                        </div>
                    )}
                >
                    <div className="flex flex-col gap-4">
                            <PanelField label="Paciente que recomendó" required>
                                <select
                                    value={form.referrerClientId}
                                    onChange={(e) => setForm((p) => ({ ...p, referrerClientId: e.target.value }))}
                                    className="form-select"
                                >
                                    <option value="">Selecciona…</option>
                                    {activeClients.map((c) => (
                                        <option key={c.id} value={c.id}>{clientFullName(c)}</option>
                                    ))}
                                </select>
                            </PanelField>
                            <PanelField label="Nombre del referido" required>
                                <input
                                    type="text"
                                    value={form.refereeName}
                                    onChange={(e) => setForm((p) => ({ ...p, refereeName: e.target.value }))}
                                    className="form-input"
                                    placeholder="Nombre completo"
                                />
                            </PanelField>
                            <PanelField label="Teléfono">
                                <input
                                    type="tel"
                                    value={form.refereePhone}
                                    onChange={(e) => setForm((p) => ({ ...p, refereePhone: e.target.value }))}
                                    className="form-input"
                                    placeholder="+56 9 1234 5678"
                                />
                            </PanelField>
                            <PanelField label="Beneficio ofrecido" hint="Opcional. Ej: 20% en la próxima sesión.">
                                <input
                                    type="text"
                                    value={form.rewardNote}
                                    onChange={(e) => setForm((p) => ({ ...p, rewardNote: e.target.value }))}
                                    className="form-input"
                                    placeholder="Descuento o detalle del premio"
                                />
                            </PanelField>
                            {createError ? <PanelNotice tone="error">{createError}</PanelNotice> : null}
                    </div>
                </AgendaScrollModal>
            ) : null}

            <PanelConfirmDialog
                open={confirmDeleteId !== null}
                title="Eliminar referido"
                message="Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                tone="danger"
                busy={savingStatus === confirmDeleteId}
                onConfirm={() => confirmDeleteId && void handleDelete(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
            />
        </PanelAccountShell>
    );
}
