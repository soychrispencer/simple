'use client';

import { useEffect, useMemo, useState } from 'react';
import { use } from 'react';
import {
    IconUserPlus,
    IconLoader2,
    IconTrash,
    IconX,
    IconCheck,
    IconAlertCircle,
    IconUsersGroup,
    IconCalendarEvent,
    IconMapPin,
    IconVideo,
    IconUser,
    IconUserCheck,
    IconUserX,
    IconMail,
    IconPhone,
    IconCurrencyDollar,
    IconEdit,
    IconPlayerStop,
    IconCircleCheck,
    IconArrowBackUp,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelButton,
    PanelField,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
} from '@simple/ui';
import {
    fetchGroupSession,
    patchGroupSession,
    addGroupAttendee,
    patchGroupAttendee,
    deleteGroupAttendee,
    fetchAgendaClients,
    type AgendaGroupSession,
    type AgendaGroupAttendee,
    type GroupAttendeeStatus,
    type GroupSessionStatus,
    type AgendaClient,
} from '@/lib/agenda-api';

type AttendeeForm = {
    clientId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    pricePaid: string;
    notes: string;
};

const emptyForm = (): AttendeeForm => ({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    pricePaid: '',
    notes: '',
});

const formatCLP = (n: number) => n.toLocaleString('es-CL');

const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const statusLabel: Record<GroupAttendeeStatus, string> = {
    registered: 'Inscrito',
    attended: 'Asistió',
    no_show: 'No asistió',
    cancelled: 'Cancelado',
};

const statusTone: Record<GroupAttendeeStatus, { bg: string; color: string }> = {
    registered: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
    attended: { bg: 'rgba(22,163,74,0.1)', color: '#15803d' },
    no_show: { bg: 'rgba(234,179,8,0.1)', color: '#b45309' },
    cancelled: { bg: 'var(--bg-muted)', color: 'var(--fg-muted)' },
};

const sessionStatusLabel: Record<GroupSessionStatus, string> = {
    scheduled: 'Programada',
    completed: 'Finalizada',
    cancelled: 'Cancelada',
};

const sessionStatusTone: Record<GroupSessionStatus, { bg: string; color: string }> = {
    scheduled: { bg: 'var(--accent-soft)', color: 'var(--accent)' },
    completed: { bg: 'rgba(22,163,74,0.1)', color: '#15803d' },
    cancelled: { bg: 'rgba(220,38,38,0.08)', color: '#b91c1c' },
};

export default function GroupSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [session, setSession] = useState<AgendaGroupSession | null>(null);
    const [attendees, setAttendees] = useState<AgendaGroupAttendee[]>([]);
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
    const [form, setForm] = useState<AttendeeForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [sessionStatusBusy, setSessionStatusBusy] = useState(false);

    const reload = async () => {
        const data = await fetchGroupSession(id);
        if (!data) {
            setNotFound(true);
            return;
        }
        setSession(data.session);
        setAttendees(data.attendees);
    };

    useEffect(() => {
        const load = async () => {
            const [data, cls] = await Promise.all([fetchGroupSession(id), fetchAgendaClients()]);
            if (!data) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setSession(data.session);
            setAttendees(data.attendees);
            setClients(cls);
            setLoading(false);
        };
        void load();
    }, [id]);

    const activeAttendees = useMemo(
        () => attendees.filter((a) => a.status !== 'cancelled'),
        [attendees]
    );
    const taken = activeAttendees.length;
    const capacityFull = session ? taken >= session.capacity : false;

    const openNew = () => {
        setEditingAttendeeId(null);
        setForm(emptyForm());
        setError(null);
        setFormOpen(true);
    };

    const openEditAttendee = (a: AgendaGroupAttendee) => {
        setEditingAttendeeId(a.id);
        setForm({
            clientId: a.clientId ?? '',
            clientName: a.clientName,
            clientEmail: a.clientEmail ?? '',
            clientPhone: a.clientPhone ?? '',
            pricePaid: a.pricePaid ?? '',
            notes: a.notes ?? '',
        });
        setError(null);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingAttendeeId(null);
        setError(null);
    };

    const handleClientSelect = (clientId: string) => {
        if (!clientId) {
            setForm((f) => ({ ...f, clientId: '', clientName: '', clientEmail: '', clientPhone: '' }));
            return;
        }
        const client = clients.find((c) => c.id === clientId);
        if (!client) return;
        const name = `${client.firstName} ${client.lastName ?? ''}`.trim();
        setForm((f) => ({
            ...f,
            clientId,
            clientName: name,
            clientEmail: client.email ?? '',
            clientPhone: client.phone ?? '',
        }));
    };

    const handleSubmit = async () => {
        setError(null);
        const clientName = form.clientName.trim();
        if (!clientName) { setError('Falta el nombre del asistente.'); return; }
        const pricePaid = form.pricePaid.trim() === '' ? null : Number(form.pricePaid);
        if (pricePaid !== null && (!Number.isFinite(pricePaid) || pricePaid < 0)) {
            setError('Monto inválido.'); return;
        }

        setSaving(true);
        const payload = {
            clientName,
            clientEmail: form.clientEmail.trim() || null,
            clientPhone: form.clientPhone.trim() || null,
            pricePaid,
            notes: form.notes.trim() || null,
        };
        const res = editingAttendeeId
            ? await patchGroupAttendee(editingAttendeeId, payload)
            : await addGroupAttendee(id, { ...payload, clientId: form.clientId || null });
        setSaving(false);

        if (!res.ok) { setError(res.error ?? 'No se pudo guardar.'); return; }
        await reload();
        setFlash(editingAttendeeId ? 'Asistente actualizado.' : 'Asistente agregado.');
        closeForm();
    };

    const handleChangeStatus = async (attendee: AgendaGroupAttendee, status: GroupAttendeeStatus) => {
        setActionId(attendee.id);
        const res = await patchGroupAttendee(attendee.id, { status });
        setActionId(null);
        if (res.ok) {
            setAttendees((prev) => prev.map((a) => a.id === attendee.id ? { ...a, status } : a));
            setFlash('Estado actualizado.');
        }
    };

    const handleDelete = async (attendeeId: string) => {
        if (typeof window !== 'undefined' && !window.confirm('¿Eliminar este asistente?')) return;
        setActionId(attendeeId);
        const res = await deleteGroupAttendee(attendeeId);
        setActionId(null);
        if (res.ok) {
            setAttendees((prev) => prev.filter((a) => a.id !== attendeeId));
            setFlash('Asistente eliminado.');
        }
    };

    const handleSessionStatus = async (status: GroupSessionStatus) => {
        if (!session) return;
        if (status === 'cancelled' && typeof window !== 'undefined') {
            if (!window.confirm('¿Cancelar esta sesión? No podrás agregar nuevos asistentes.')) return;
        }
        setSessionStatusBusy(true);
        const res = await patchGroupSession(session.id, { status });
        setSessionStatusBusy(false);
        if (res.ok) {
            setSession((prev) => prev ? { ...prev, status } : prev);
            setFlash(
                status === 'completed' ? 'Sesión marcada como finalizada.'
                    : status === 'cancelled' ? 'Sesión cancelada.'
                        : 'Sesión reactivada.'
            );
        }
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            </div>
        );
    }

    if (notFound || !session) {
        return (
            <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
                <PanelPageHeader backHref="/panel/configuracion/grupales" title="Sesión no encontrada" />
                <PanelEmptyState
                    title="No encontramos esta sesión"
                    description="Puede que haya sido eliminada."
                />
            </div>
        );
    }

    const statusTone_ = sessionStatusTone[session.status];

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion/grupales"
                title={session.title}
                description={`${taken}/${session.capacity} asistentes`}
                actions={
                    <PanelButton
                        variant="accent"
                        size="sm"
                        onClick={openNew}
                        disabled={capacityFull || session.status !== 'scheduled'}
                    >
                        <IconUserPlus size={14} /> Agregar
                    </PanelButton>
                }
            />

            {flash && (
                <div className="mb-4">
                    <PanelNotice tone="success">
                        <span className="flex items-center gap-2">
                            <IconCheck size={14} /> {flash}
                        </span>
                    </PanelNotice>
                </div>
            )}

            <PanelCard size="md" className="mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconUsersGroup size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={statusTone_}>
                                {sessionStatusLabel[session.status]}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                            <span className="flex items-center gap-1">
                                <IconCalendarEvent size={12} /> {formatDateTime(session.startsAt)} · {session.durationMinutes} min
                            </span>
                            {session.modality === 'online' ? (
                                <span className="flex items-center gap-1">
                                    <IconVideo size={12} /> Online
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <IconMapPin size={12} /> {session.location ?? 'Presencial'}
                                </span>
                            )}
                            {session.price && (
                                <span className="flex items-center gap-1">
                                    <IconCurrencyDollar size={12} /> ${formatCLP(Number(session.price))}
                                </span>
                            )}
                        </div>
                        {session.description && (
                            <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>{session.description}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                            {session.status === 'scheduled' && (
                                <>
                                    <PanelButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => void handleSessionStatus('completed')}
                                        disabled={sessionStatusBusy}
                                    >
                                        <IconCircleCheck size={13} /> Marcar finalizada
                                    </PanelButton>
                                    <PanelButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void handleSessionStatus('cancelled')}
                                        disabled={sessionStatusBusy}
                                    >
                                        <IconPlayerStop size={13} /> Cancelar sesión
                                    </PanelButton>
                                </>
                            )}
                            {(session.status === 'completed' || session.status === 'cancelled') && (
                                <PanelButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void handleSessionStatus('scheduled')}
                                    disabled={sessionStatusBusy}
                                >
                                    <IconArrowBackUp size={13} /> Volver a programada
                                </PanelButton>
                            )}
                        </div>
                    </div>
                </div>
            </PanelCard>

            {attendees.length === 0 ? (
                <PanelEmptyState
                    title="Aún no hay asistentes"
                    description="Agrega pacientes o personas externas a esta sesión."
                    action={
                        <PanelButton variant="accent" size="sm" onClick={openNew} disabled={capacityFull || session.status !== 'scheduled'}>
                            <IconUserPlus size={14} /> Agregar asistente
                        </PanelButton>
                    }
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {attendees.map((a) => {
                        const tone = statusTone[a.status];
                        return (
                            <PanelCard key={a.id} size="sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                        <IconUser size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{a.clientName}</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={tone}>
                                                {statusLabel[a.status]}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                            {a.clientEmail && (
                                                <span className="flex items-center gap-1">
                                                    <IconMail size={11} /> {a.clientEmail}
                                                </span>
                                            )}
                                            {a.clientPhone && (
                                                <span className="flex items-center gap-1">
                                                    <IconPhone size={11} /> {a.clientPhone}
                                                </span>
                                            )}
                                            {a.pricePaid && (
                                                <span className="flex items-center gap-1">
                                                    <IconCurrencyDollar size={11} /> ${formatCLP(Number(a.pricePaid))} pagado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {a.status === 'registered' && (
                                            <>
                                                <span title="Marcar como asistió">
                                                    <PanelButton
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => void handleChangeStatus(a, 'attended')}
                                                        disabled={actionId === a.id}
                                                    >
                                                        <IconUserCheck size={14} style={{ color: '#15803d' }} />
                                                    </PanelButton>
                                                </span>
                                                <span title="Marcar como no asistió">
                                                    <PanelButton
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => void handleChangeStatus(a, 'no_show')}
                                                        disabled={actionId === a.id}
                                                    >
                                                        <IconUserX size={14} style={{ color: '#b45309' }} />
                                                    </PanelButton>
                                                </span>
                                            </>
                                        )}
                                        {(a.status === 'attended' || a.status === 'no_show') && (
                                            <span title="Volver a inscrito">
                                                <PanelButton
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => void handleChangeStatus(a, 'registered')}
                                                    disabled={actionId === a.id}
                                                >
                                                    <IconUser size={14} />
                                                </PanelButton>
                                            </span>
                                        )}
                                        <span title="Editar">
                                            <PanelButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditAttendee(a)}
                                                disabled={actionId === a.id}
                                            >
                                                <IconEdit size={14} />
                                            </PanelButton>
                                        </span>
                                        <PanelButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void handleDelete(a.id)}
                                            disabled={actionId === a.id}
                                        >
                                            {actionId === a.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
                                        </PanelButton>
                                    </div>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}

            {formOpen && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeForm}>
                    <div
                        className="w-full max-w-lg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                {editingAttendeeId ? 'Editar asistente' : 'Agregar asistente'}
                            </h2>
                            <button type="button" onClick={closeForm} className="p-1 rounded-lg hover:bg-(--bg-muted)">
                                <IconX size={16} style={{ color: 'var(--fg-muted)' }} />
                            </button>
                        </div>

                        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-4">
                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c' }}>
                                    <IconAlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    {error}
                                </div>
                            )}

                            {!editingAttendeeId && clients.length > 0 && (
                                <PanelField label="Seleccionar cliente existente" hint="Opcional. O ingresa los datos manualmente.">
                                    <select
                                        value={form.clientId}
                                        onChange={(e) => handleClientSelect(e.target.value)}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    >
                                        <option value="">Otro / invitado</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {`${c.firstName} ${c.lastName ?? ''}`.trim()}
                                            </option>
                                        ))}
                                    </select>
                                </PanelField>
                            )}

                            <PanelField label="Nombre" required>
                                <input
                                    type="text"
                                    value={form.clientName}
                                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                                    placeholder="Nombre del asistente"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <PanelField label="Email">
                                    <input
                                        type="email"
                                        value={form.clientEmail}
                                        onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                                        placeholder="email@ejemplo.com"
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                                <PanelField label="Teléfono">
                                    <input
                                        type="tel"
                                        value={form.clientPhone}
                                        onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                                        placeholder="+56 9..."
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            </div>

                            <PanelField label="Monto pagado" hint="Opcional. Deja vacío si aún no paga.">
                                <input
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={form.pricePaid}
                                    onChange={(e) => setForm((f) => ({ ...f, pricePaid: e.target.value }))}
                                    placeholder={session.price ?? '0'}
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <PanelField label="Notas" hint="Opcional.">
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <PanelButton variant="secondary" size="sm" onClick={closeForm}>Cancelar</PanelButton>
                            <PanelButton variant="accent" size="sm" onClick={() => void handleSubmit()} disabled={saving}>
                                {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                {editingAttendeeId ? 'Guardar' : 'Agregar'}
                            </PanelButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
