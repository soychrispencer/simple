'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    IconAlertTriangle,
    IconBrandWhatsapp,
    IconCheck,
    IconMessageCircle,
    IconPlus,
    IconRefresh,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import {
    PanelButton,
    PanelCard,
    PanelEmptyState,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
} from '@simple/ui/panel';
import {
    captureAdminWhatsappConversation,
    fetchAdminConversations,
    updateAdminConversationStatus,
    type AdminConversationItem,
    type AdminConversationsSummary,
} from '@/lib/api';

type StatusFilter = 'pending' | 'done' | 'all';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'done', label: 'Respondidas' },
    { value: 'all', label: 'Todas' },
];

const SOURCE_OPTIONS = [
    { value: '', label: 'Sin vertical / general' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'Plataforma' },
];

function formatHours(hours: number): string {
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
    if (hours < 48) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} d`;
}

export function AdminConversationsDashboard() {
    const [status, setStatus] = useState<StatusFilter>('pending');
    const [items, setItems] = useState<AdminConversationItem[]>([]);
    const [summary, setSummary] = useState<AdminConversationsSummary>({
        pendingCount: 0,
        overdueCount: 0,
        doneCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyThreadId, setBusyThreadId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [sourceVertical, setSourceVertical] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminConversations(status);
            setItems(data.items);
            setSummary(data.summary);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron cargar las conversaciones.');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleCapture(event: React.FormEvent) {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            await captureAdminWhatsappConversation({
                phone,
                name: name.trim() || undefined,
                message: message.trim() || undefined,
                sourceVertical: sourceVertical || undefined,
            });
            setPhone('');
            setName('');
            setMessage('');
            setSourceVertical('');
            setShowForm(false);
            setStatus('pending');
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar el contacto.');
        } finally {
            setSaving(false);
        }
    }

    async function markDone(threadId: string) {
        setBusyThreadId(threadId);
        setError('');
        try {
            await updateAdminConversationStatus(threadId, { status: 'done' });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
        } finally {
            setBusyThreadId(null);
        }
    }

    return (
        <div className="space-y-5">
            <PanelPageHeader
                title="Conversaciones"
                description="Bandeja de pendientes de atención (WhatsApp y otros canales capturados a mano)."
                actions={(
                    <>
                        <PanelButton variant="secondary" onClick={() => void load()} disabled={loading}>
                            <IconRefresh size={16} />
                            Actualizar
                        </PanelButton>
                        <PanelButton onClick={() => setShowForm((current) => !current)}>
                            <IconPlus size={16} />
                            Registrar WhatsApp
                        </PanelButton>
                    </>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <PanelStatCard
                    label="Sin responder"
                    value={String(summary.pendingCount)}
                    meta="Estado pendiente"
                    icon={<IconMessageCircle size={18} />}
                />
                <PanelStatCard
                    label="+24 horas"
                    value={String(summary.overdueCount)}
                    meta="Requieren prioridad"
                    icon={<IconAlertTriangle size={18} />}
                />
                <PanelStatCard
                    label="Respondidas"
                    value={String(summary.doneCount)}
                    meta="Cerradas en el historial"
                    icon={<IconCheck size={18} />}
                />
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}

            {showForm ? (
                <PanelCard className="space-y-4 p-4">
                    <div>
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                            Registrar contacto por WhatsApp
                        </h2>
                        <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            No conecta Meta API: solo deja el lead en timeline como pendiente de respuesta.
                        </p>
                    </div>
                    <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleCapture(event)}>
                        <label className="grid gap-1.5 text-xs md:col-span-1">
                            <span style={{ color: 'var(--fg-muted)' }}>WhatsApp / teléfono</span>
                            <input
                                className="form-input"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="+56912345678"
                                required
                            />
                        </label>
                        <label className="grid gap-1.5 text-xs">
                            <span style={{ color: 'var(--fg-muted)' }}>Nombre (opcional)</span>
                            <input
                                className="form-input"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Nombre del contacto"
                            />
                        </label>
                        <label className="grid gap-1.5 text-xs md:col-span-2">
                            <span style={{ color: 'var(--fg-muted)' }}>Mensaje / motivo</span>
                            <textarea
                                className="form-input min-h-24 py-2"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Ej: No le llega el correo de verificación / Consulta por razón social"
                            />
                        </label>
                        <label className="grid gap-1.5 text-xs md:col-span-1">
                            <span style={{ color: 'var(--fg-muted)' }}>Vertical de origen</span>
                            <ModernSelect
                                value={sourceVertical}
                                onChange={setSourceVertical}
                                options={SOURCE_OPTIONS}
                                ariaLabel="Vertical de origen"
                            />
                        </label>
                        <div className="flex items-end gap-2 md:col-span-1">
                            <PanelButton type="submit" disabled={saving || !phone.trim()} className="w-full">
                                <IconBrandWhatsapp size={16} />
                                {saving ? 'Guardando…' : 'Guardar pendiente'}
                            </PanelButton>
                        </div>
                    </form>
                </PanelCard>
            ) : null}

            <div className="w-full max-w-xs">
                <label className="grid gap-1.5 text-xs">
                    <span style={{ color: 'var(--fg-muted)' }}>Filtrar</span>
                    <ModernSelect
                        value={status}
                        onChange={(value) => setStatus(value as StatusFilter)}
                        options={STATUS_OPTIONS}
                        ariaLabel="Filtrar conversaciones"
                    />
                </label>
            </div>

            <PanelList>
                <PanelListHeader className="grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_140px]">
                    <span>Contacto</span>
                    <span>Último mensaje</span>
                    <span>Espera</span>
                    <span className="text-right">Acciones</span>
                </PanelListHeader>
                {loading ? (
                    <PanelListRow className="p-5">
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando conversaciones…</p>
                    </PanelListRow>
                ) : items.length === 0 ? (
                    <PanelListRow className="p-5">
                        <PanelEmptyState
                            title="Sin conversaciones en este filtro"
                            description="Registra un WhatsApp recibido a mano para que aparezca como pendiente."
                        />
                    </PanelListRow>
                ) : items.map((item) => (
                    <PanelListRow
                        key={item.threadId}
                        className="grid gap-3 p-4 md:grid-cols-[minmax(160px,1fr)_minmax(200px,1.4fr)_90px_140px] md:items-center"
                    >
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                {item.name || item.phone || item.threadId}
                            </p>
                            <p className="mt-0.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {item.phone || 'Sin teléfono'}
                                {item.sourceVertical ? ` · ${item.sourceVertical}` : ''}
                            </p>
                            {item.overdue24h ? (
                                <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--color-warning-text, #b45309)' }}>
                                    +24 h sin respuesta
                                </p>
                            ) : null}
                        </div>
                        <p className="line-clamp-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            {item.lastMessage || '—'}
                        </p>
                        <div className="text-sm" style={{ color: item.overdue24h ? 'var(--color-warning-text, #b45309)' : 'var(--fg-muted)' }}>
                            {item.status === 'pending' ? formatHours(item.hoursPending) : 'Hecho'}
                        </div>
                        <div className="flex justify-end gap-2">
                            {item.status === 'pending' ? (
                                <PanelButton
                                    variant="secondary"
                                    disabled={busyThreadId === item.threadId}
                                    onClick={() => void markDone(item.threadId)}
                                >
                                    <IconCheck size={14} />
                                    Respondido
                                </PanelButton>
                            ) : (
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Cerrada</span>
                            )}
                        </div>
                    </PanelListRow>
                ))}
            </PanelList>
        </div>
    );
}
