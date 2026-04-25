'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconPlus,
    IconLoader2,
    IconTrash,
    IconEdit,
    IconX,
    IconCheck,
    IconAlertCircle,
    IconUsersGroup,
    IconChevronRight,
    IconCalendarEvent,
    IconUser,
    IconMapPin,
    IconVideo,
} from '@tabler/icons-react';
import {
    PanelCard,
    PanelButton,
    PanelField,
    PanelSwitch,
    PanelNotice,
    PanelPageHeader,
    PanelEmptyState,
} from '@simple/ui';
import {
    fetchGroupSessions,
    createGroupSession,
    patchGroupSession,
    deleteGroupSession,
    fetchAgendaServices,
    type AgendaGroupSession,
    type AgendaService,
    type GroupSessionModality,
} from '@/lib/agenda-api';

type SessionForm = {
    title: string;
    description: string;
    serviceId: string;
    startsAt: string;
    durationMinutes: string;
    capacity: string;
    price: string;
    modality: GroupSessionModality;
    location: string;
    meetingUrl: string;
    isPublic: boolean;
};

const emptyForm = (): SessionForm => ({
    title: '',
    description: '',
    serviceId: '',
    startsAt: '',
    durationMinutes: '60',
    capacity: '8',
    price: '',
    modality: 'presential',
    location: '',
    meetingUrl: '',
    isPublic: true,
});

const formatCLP = (n: number) => n.toLocaleString('es-CL');

const toLocalInput = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const sessionToForm = (s: AgendaGroupSession): SessionForm => ({
    title: s.title,
    description: s.description ?? '',
    serviceId: s.serviceId ?? '',
    startsAt: toLocalInput(s.startsAt),
    durationMinutes: String(s.durationMinutes),
    capacity: String(s.capacity),
    price: s.price ?? '',
    modality: s.modality,
    location: s.location ?? '',
    meetingUrl: s.meetingUrl ?? '',
    isPublic: s.isPublic,
});

type Tone = { bg: string; color: string };

const statusMeta = (s: AgendaGroupSession): { label: string; tone: Tone } => {
    if (s.status === 'cancelled') return { label: 'Cancelada', tone: { bg: 'rgba(220,38,38,0.08)', color: '#b91c1c' } };
    if (s.status === 'completed') return { label: 'Finalizada', tone: { bg: 'var(--bg-muted)', color: 'var(--fg-muted)' } };
    const taken = s.attendeeCount ?? 0;
    const isPast = new Date(s.startsAt).getTime() < Date.now();
    if (isPast) return { label: 'Pasada', tone: { bg: 'var(--bg-muted)', color: 'var(--fg-muted)' } };
    if (taken >= s.capacity) return { label: 'Sin cupos', tone: { bg: 'rgba(234,179,8,0.1)', color: '#b45309' } };
    return { label: 'Programada', tone: { bg: 'var(--accent-soft)', color: 'var(--accent)' } };
};

export default function GrupalesPage() {
    const [sessions, setSessions] = useState<AgendaGroupSession[]>([]);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<SessionForm>(emptyForm());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const [sess, svcs] = await Promise.all([fetchGroupSessions(), fetchAgendaServices()]);
            setSessions(sess);
            setServices(svcs);
            setLoading(false);
        };
        void load();
    }, []);

    const openNew = () => {
        setEditingId(null);
        setForm(emptyForm());
        setError(null);
        setFormOpen(true);
    };

    const openEdit = (s: AgendaGroupSession) => {
        setEditingId(s.id);
        setForm(sessionToForm(s));
        setError(null);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setError(null);
    };

    const handleSubmit = async () => {
        setError(null);
        const title = form.title.trim();
        if (!title) { setError('Falta el título.'); return; }
        if (!form.startsAt) { setError('Indica fecha y hora de inicio.'); return; }
        const duration = Number(form.durationMinutes);
        if (!Number.isFinite(duration) || duration <= 0) { setError('Duración inválida.'); return; }
        const capacity = Number(form.capacity);
        if (!Number.isFinite(capacity) || capacity <= 0) { setError('Cupo inválido.'); return; }
        const price = form.price.trim() === '' ? null : Number(form.price);
        if (price !== null && (!Number.isFinite(price) || price < 0)) { setError('Precio inválido.'); return; }
        if (form.modality === 'presential' && !form.location.trim()) {
            setError('Indica la dirección del evento.'); return;
        }

        const startsIso = new Date(form.startsAt).toISOString();
        const payload = {
            title,
            description: form.description.trim() || null,
            serviceId: form.serviceId || null,
            startsAt: startsIso,
            durationMinutes: Math.floor(duration),
            capacity: Math.floor(capacity),
            price,
            modality: form.modality,
            location: form.modality === 'presential' ? form.location.trim() : null,
            meetingUrl: form.modality === 'online' ? form.meetingUrl.trim() || null : null,
            isPublic: form.isPublic,
        };

        setSaving(true);
        const res = editingId
            ? await patchGroupSession(editingId, payload)
            : await createGroupSession(payload);
        setSaving(false);

        if (!res.ok) { setError(res.error ?? 'No se pudo guardar.'); return; }
        const updated = await fetchGroupSessions();
        setSessions(updated);
        setFlash(editingId ? 'Sesión actualizada.' : 'Sesión creada.');
        closeForm();
    };

    const handleDelete = async (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('¿Eliminar esta sesión? Se borrarán también sus asistentes.')) return;
        setDeletingId(id);
        const res = await deleteGroupSession(id);
        setDeletingId(null);
        if (res.ok) {
            setSessions((prev) => prev.filter((x) => x.id !== id));
            setFlash('Sesión eliminada.');
        } else {
            setError(res.error ?? 'No se pudo eliminar.');
        }
    };

    const visibleServices = useMemo(() => services.filter((s) => s.isActive), [services]);

    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion/servicios"
                title="Sesiones grupales"
                description="Talleres y grupos con cupo limitado. Un solo horario, varios participantes."
                actions={
                    <PanelButton variant="accent" size="sm" onClick={openNew}>
                        <IconPlus size={14} /> Nueva
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

            {loading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : sessions.length === 0 && !formOpen ? (
                <PanelEmptyState
                    title="Aún no tienes sesiones grupales"
                    description="Crea un taller, clase o grupo con cupo limitado."
                    action={<PanelButton variant="accent" size="sm" onClick={openNew}><IconPlus size={14} /> Crear sesión</PanelButton>}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {sessions.map((s) => {
                        const meta = statusMeta(s);
                        const taken = s.attendeeCount ?? 0;
                        const price = s.price ? Number(s.price) : null;
                        return (
                            <PanelCard key={s.id} size="md">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                        <IconUsersGroup size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{s.title}</h3>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={meta.tone}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                                            <span className="flex items-center gap-1">
                                                <IconCalendarEvent size={12} /> {formatDateTime(s.startsAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <IconUser size={12} /> {taken}/{s.capacity}
                                            </span>
                                            {price !== null && <span>${formatCLP(price)}</span>}
                                            <span className="flex items-center gap-1">
                                                {s.modality === 'online' ? <IconVideo size={12} /> : <IconMapPin size={12} />}
                                                {s.modality === 'online' ? 'Online' : 'Presencial'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Link
                                            href={`/panel/configuracion/grupales/${s.id}`}
                                            className="h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-medium hover:bg-(--bg-muted)"
                                            style={{ color: 'var(--fg)' }}
                                        >
                                            Asistentes <IconChevronRight size={12} />
                                        </Link>
                                        <PanelButton variant="ghost" size="sm" onClick={() => openEdit(s)}>
                                            <IconEdit size={14} />
                                        </PanelButton>
                                        <PanelButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void handleDelete(s.id)}
                                            disabled={deletingId === s.id}
                                        >
                                            {deletingId === s.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
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
                                {editingId ? 'Editar sesión' : 'Nueva sesión grupal'}
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

                            <PanelField label="Título" required>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="Taller de mindfulness"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <PanelField label="Descripción" hint="Opcional. Se muestra a los participantes.">
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Qué incluye, a quién va dirigido..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl text-sm resize-none"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            {visibleServices.length > 0 && (
                                <PanelField label="Servicio asociado" hint="Opcional. Vincula la sesión a un servicio.">
                                    <select
                                        value={form.serviceId}
                                        onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    >
                                        <option value="">Ninguno</option>
                                        {visibleServices.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </PanelField>
                            )}

                            <PanelField label="Fecha y hora" required>
                                <input
                                    type="datetime-local"
                                    value={form.startsAt}
                                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <div className="grid grid-cols-2 gap-3">
                                <PanelField label="Duración (min)" required>
                                    <input
                                        type="number"
                                        min={5}
                                        step={5}
                                        value={form.durationMinutes}
                                        onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                                <PanelField label="Cupo máximo" required>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.capacity}
                                        onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            </div>

                            <PanelField label="Precio por persona" hint="Dejar vacío si es gratis.">
                                <input
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={form.price}
                                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                    placeholder="Gratis"
                                    className="w-full h-9 px-3 rounded-xl text-sm"
                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                />
                            </PanelField>

                            <PanelField label="Modalidad">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, modality: 'presential' }))}
                                        className="h-9 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                                        style={{
                                            background: form.modality === 'presential' ? 'var(--accent-soft)' : 'var(--bg)',
                                            border: `1px solid ${form.modality === 'presential' ? 'var(--accent)' : 'var(--border)'}`,
                                            color: form.modality === 'presential' ? 'var(--accent)' : 'var(--fg-muted)',
                                        }}
                                    ><IconMapPin size={12} /> Presencial</button>
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, modality: 'online' }))}
                                        className="h-9 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                                        style={{
                                            background: form.modality === 'online' ? 'var(--accent-soft)' : 'var(--bg)',
                                            border: `1px solid ${form.modality === 'online' ? 'var(--accent)' : 'var(--border)'}`,
                                            color: form.modality === 'online' ? 'var(--accent)' : 'var(--fg-muted)',
                                        }}
                                    ><IconVideo size={12} /> Online</button>
                                </div>
                            </PanelField>

                            {form.modality === 'presential' ? (
                                <PanelField label="Dirección" required>
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                                        placeholder="Av. Providencia 123, Of. 301"
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            ) : (
                                <PanelField label="Link de la reunión" hint="Opcional. Se compartirá con los asistentes.">
                                    <input
                                        type="url"
                                        value={form.meetingUrl}
                                        onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
                                        placeholder="https://meet.google.com/..."
                                        className="w-full h-9 px-3 rounded-xl text-sm"
                                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                                    />
                                </PanelField>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Visible en tu link público</span>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Permite que los pacientes vean y reserven esta sesión.
                                    </span>
                                </div>
                                <PanelSwitch checked={form.isPublic} onChange={(v) => setForm((f) => ({ ...f, isPublic: v }))} />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            <PanelButton variant="secondary" size="sm" onClick={closeForm}>Cancelar</PanelButton>
                            <PanelButton variant="accent" size="sm" onClick={() => void handleSubmit()} disabled={saving}>
                                {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                Guardar
                            </PanelButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
