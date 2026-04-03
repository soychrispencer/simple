'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    IconChevronLeft,
    IconChevronRight,
    IconPlus,
    IconX,
    IconLoader2,
    IconCalendar,
    IconUser,
    IconClock,
    IconMapPin,
    IconVideo,
    IconCheck,
    IconBan,
    IconNotes,
    IconEdit,
    IconLayoutGrid,
    IconLayoutColumns,
} from '@tabler/icons-react';
import {
    fetchAgendaAppointments,
    createAgendaAppointment,
    patchAppointmentStatus,
    updateAgendaAppointment,
    fetchAgendaServices,
    fetchAgendaClients,
    fetchAgendaNote,
    saveAgendaNote,
    type AgendaAppointment,
    type AgendaService,
    type AgendaClient,
} from '@/lib/agenda-api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday first
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isoDateInput(date: Date): string {
    return date.toISOString().slice(0, 16);
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#F59E0B',
    confirmed: '#0D9488',
    completed: '#6366F1',
    cancelled: '#EF4444',
    no_show: '#9CA3AF',
};

function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function getMonthGridDays(monthDate: Date): Date[] {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    // Start from Monday of the week containing the 1st
    const gridStart = new Date(first);
    const startDay = first.getDay();
    gridStart.setDate(first.getDate() - (startDay === 0 ? 6 : startDay - 1));
    // End on Sunday of the week containing the last day
    const gridEnd = new Date(last);
    const endDay = last.getDay();
    if (endDay !== 0) gridEnd.setDate(last.getDate() + (7 - endDay));

    const days: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AppointmentsByDay = Record<string, AgendaAppointment[]>;
type ViewMode = 'week' | 'month';

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgendaPage() {
    const [view, setView] = useState<ViewMode>('week');
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [monthDate, setMonthDate] = useState(() => new Date());
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [clients, setClients] = useState<AgendaClient[]>([]);

    // Modal states
    const [showCreate, setShowCreate] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null);
    const [savingStatus, setSavingStatus] = useState<string | null>(null);

    // Session notes
    const [noteContent, setNoteContent] = useState('');
    const [noteOriginal, setNoteOriginal] = useState('');
    const [noteLoading, setNoteLoading] = useState(false);
    const [noteSaving, setNoteSaving] = useState(false);
    const [noteSaved, setNoteSaved] = useState(false);

    // Edit appointment
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ startsAt: '', durationMinutes: 60, price: '', internalNotes: '' });
    const [editSaving, setEditSaving] = useState(false);

    // Create form
    const [form, setForm] = useState({
        clientId: '',
        clientName: '',
        clientEmail: '',
        serviceId: '',
        startsAt: isoDateInput(new Date()),
        durationMinutes: 50,
        modality: 'online',
        price: '',
        internalNotes: '',
        repeatWeekly: 0,
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const weekEnd = addDays(weekStart, 6);

    const load = useCallback(async () => {
        setLoading(true);
        const from = view === 'month' ? getMonthStart(monthDate).toISOString() : weekStart.toISOString();
        const to   = view === 'month' ? getMonthEnd(monthDate).toISOString()   : weekEnd.toISOString();
        const [appts, svcs, cls] = await Promise.all([
            fetchAgendaAppointments(from, to),
            fetchAgendaServices(),
            fetchAgendaClients(),
        ]);
        setAppointments(appts);
        setServices(svcs);
        setClients(cls);
        setLoading(false);
    }, [view, weekStart, monthDate]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { void load(); }, [load]);

    // Group appointments by YYYY-MM-DD
    const byDay: AppointmentsByDay = {};
    for (const appt of appointments) {
        const key = appt.startsAt.slice(0, 10);
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(appt);
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const monthGridDays = getMonthGridDays(monthDate);

    const handlePrevWeek = () => setWeekStart((d) => addDays(d, -7));
    const handleNextWeek = () => setWeekStart((d) => addDays(d, 7));
    const handleToday = () => {
        setWeekStart(getWeekStart(new Date()));
        setMonthDate(new Date());
    };
    const handlePrevMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const handleCreateOpen = (date?: Date) => {
        setCreateError('');
        setForm({
            clientId: '',
            clientName: '',
            clientEmail: '',
            serviceId: services[0]?.id ?? '',
            startsAt: date ? isoDateInput(date) : isoDateInput(new Date()),
            durationMinutes: services[0]?.durationMinutes ?? 50,
            modality: 'online',
            price: services[0]?.price ?? '',
            internalNotes: '',
            repeatWeekly: 0,
        });
        setShowCreate(true);
    };

    const handleServiceChange = (serviceId: string) => {
        const svc = services.find((s) => s.id === serviceId);
        setForm((prev) => ({
            ...prev,
            serviceId,
            durationMinutes: svc?.durationMinutes ?? prev.durationMinutes,
            price: svc?.price ?? prev.price,
        }));
    };

    const handleClientChange = (clientId: string) => {
        const client = clients.find((c) => c.id === clientId);
        setForm((prev) => ({
            ...prev,
            clientId,
            clientName: client ? `${client.firstName} ${client.lastName ?? ''}`.trim() : prev.clientName,
            clientEmail: client?.email ?? prev.clientEmail,
        }));
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!form.clientName.trim() && !form.clientId) {
            setCreateError('Indica el nombre del paciente o selecciona uno existente.');
            return;
        }
        setCreating(true);
        const result = await createAgendaAppointment({
            ...form,
            clientId: form.clientId || null,
            clientName: form.clientName || null,
            clientEmail: form.clientEmail || null,
            serviceId: form.serviceId || null,
            price: form.price || null,
            repeatWeekly: form.repeatWeekly > 0 ? form.repeatWeekly : undefined,
        });
        setCreating(false);
        if (!result.ok) { setCreateError(result.error ?? 'Error al crear la cita.'); return; }
        setShowCreate(false);
        await load();
    };

    // Load note when appointment is selected
    const handleSelectAppt = async (appt: AgendaAppointment) => {
        setSelectedAppt(appt);
        setNoteContent('');
        setNoteOriginal('');
        setNoteSaved(false);
        setNoteLoading(true);
        const note = await fetchAgendaNote(appt.id);
        const content = note?.content ?? '';
        setNoteContent(content);
        setNoteOriginal(content);
        setNoteLoading(false);
    };

    const handleSaveNote = async () => {
        if (!selectedAppt) return;
        setNoteSaving(true);
        await saveAgendaNote(selectedAppt.id, noteContent);
        setNoteOriginal(noteContent);
        setNoteSaving(false);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
    };

    const handleOpenEdit = () => {
        if (!selectedAppt) return;
        setEditForm({
            startsAt: selectedAppt.startsAt.slice(0, 16),
            durationMinutes: selectedAppt.durationMinutes,
            price: selectedAppt.price ?? '',
            internalNotes: selectedAppt.internalNotes ?? '',
        });
        setShowEdit(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedAppt) return;
        setEditSaving(true);
        const result = await updateAgendaAppointment(selectedAppt.id, {
            startsAt: editForm.startsAt,
            durationMinutes: editForm.durationMinutes,
            price: editForm.price || null,
            internalNotes: editForm.internalNotes || null,
        } as Partial<AgendaAppointment>);
        setEditSaving(false);
        if (result.ok && result.appointment) {
            setSelectedAppt(result.appointment);
            setAppointments((prev) => prev.map((a) => a.id === result.appointment!.id ? result.appointment! : a));
            setShowEdit(false);
        }
    };

    const handleStatusChange = async (appt: AgendaAppointment, status: string) => {
        setSavingStatus(status);
        await patchAppointmentStatus(appt.id, status);
        setSavingStatus(null);
        setSelectedAppt((prev) => prev ? { ...prev, status } : null);
        setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status } : a));
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    const weekLabel = `${weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const monthLabel = monthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div className="p-4 sm:p-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Mi Agenda</h1>
                    <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--fg-muted)' }}>
                        {view === 'month' ? monthLabel : weekLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View toggle */}
                    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={() => setView('week')}
                            className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                            style={{ background: view === 'week' ? 'var(--accent)' : 'transparent', color: view === 'week' ? '#fff' : 'var(--fg-muted)' }}
                        >
                            <IconLayoutColumns size={13} /> Semana
                        </button>
                        <button
                            onClick={() => setView('month')}
                            className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                            style={{ background: view === 'month' ? 'var(--accent)' : 'transparent', color: view === 'month' ? '#fff' : 'var(--fg-muted)' }}
                        >
                            <IconLayoutGrid size={13} /> Mes
                        </button>
                    </div>
                    <button onClick={handleToday} className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                        Hoy
                    </button>
                    <button
                        onClick={view === 'month' ? handlePrevMonth : handlePrevWeek}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                        <IconChevronLeft size={16} />
                    </button>
                    <button
                        onClick={view === 'month' ? handleNextMonth : handleNextWeek}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                        <IconChevronRight size={16} />
                    </button>
                    <button
                        onClick={() => handleCreateOpen()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        <IconPlus size={15} />
                        Nueva cita
                    </button>
                </div>
            </div>

            {/* Month view */}
            {view === 'month' && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        {dayHeaders.map((d) => (
                            <div key={d} className="p-2 text-center text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--fg-muted)' }}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {monthGridDays.map((day) => {
                            const key = day.toISOString().slice(0, 10);
                            const isToday = key === todayKey;
                            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                            const dayAppts = (byDay[key] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                            return (
                                <div
                                    key={key}
                                    className="border-r border-b last:border-r-0 p-1.5 min-h-[90px] cursor-pointer hover:bg-(--bg-subtle) transition-colors"
                                    style={{ borderColor: 'var(--border)', background: isToday ? 'var(--accent-soft)' : 'transparent' }}
                                    onClick={() => handleCreateOpen(day)}
                                >
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1"
                                        style={{
                                            background: isToday ? 'var(--accent)' : 'transparent',
                                            color: isToday ? '#fff' : isCurrentMonth ? 'var(--fg)' : 'var(--fg-muted)',
                                            opacity: isCurrentMonth ? 1 : 0.4,
                                        }}
                                    >
                                        {day.getDate()}
                                    </div>
                                    {loading ? null : dayAppts.slice(0, 3).map((appt) => (
                                        <button
                                            key={appt.id}
                                            onClick={(e) => { e.stopPropagation(); void handleSelectAppt(appt); }}
                                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 transition-opacity hover:opacity-80"
                                            style={{ background: STATUS_COLORS[appt.status] ?? 'var(--accent)', color: '#fff' }}
                                        >
                                            {formatTime(appt.startsAt)} {appt.clientName ?? appt.client?.firstName ?? '—'}
                                        </button>
                                    ))}
                                    {!loading && dayAppts.length > 3 && (
                                        <p className="text-[10px] pl-1" style={{ color: 'var(--fg-muted)' }}>+{dayAppts.length - 3} más</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Week view */}
            {view === 'week' && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {weekDays.map((day) => {
                        const key = day.toISOString().slice(0, 10);
                        const isToday = key === todayKey;
                        return (
                            <div
                                key={key}
                                className="p-3 text-center cursor-pointer hover:bg-(--bg-subtle) transition-colors"
                                onClick={() => handleCreateOpen(day)}
                            >
                                <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--fg-muted)' }}>
                                    {day.toLocaleDateString('es-CL', { weekday: 'short' })}
                                </p>
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-semibold"
                                    style={{
                                        background: isToday ? 'var(--accent)' : 'transparent',
                                        color: isToday ? '#fff' : 'var(--fg)',
                                    }}
                                >
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Day columns */}
                <div className="grid grid-cols-7 min-h-80">
                    {weekDays.map((day) => {
                        const key = day.toISOString().slice(0, 10);
                        const dayAppts = (byDay[key] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                        const isToday = key === todayKey;
                        return (
                            <div
                                key={key}
                                className="border-r last:border-r-0 p-1.5 flex flex-col gap-1 cursor-pointer min-h-80"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: isToday ? 'var(--accent-soft)' : 'transparent',
                                }}
                                onClick={() => handleCreateOpen(day)}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center h-10 mt-4">
                                        <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                    </div>
                                ) : dayAppts.map((appt) => (
                                    <button
                                        key={appt.id}
                                        onClick={(e) => { e.stopPropagation(); void handleSelectAppt(appt); }}
                                        className="w-full text-left p-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                                        style={{
                                            background: STATUS_COLORS[appt.status] ?? 'var(--accent)',
                                            color: '#fff',
                                        }}
                                    >
                                        <p className="font-semibold leading-tight truncate">
                                            {formatTime(appt.startsAt)}
                                        </p>
                                        <p className="leading-tight truncate opacity-90">
                                            {appt.clientName ?? appt.client?.firstName ?? '—'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Appointment detail modal */}
            {selectedAppt && !showEdit && (
                <Modal title="Detalle de cita" onClose={() => setSelectedAppt(null)}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                                style={{ background: STATUS_COLORS[selectedAppt.status] ?? 'var(--accent)' }}
                            >
                                {STATUS_LABELS[selectedAppt.status] ?? selectedAppt.status}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <InfoRow icon={<IconUser size={14} />} label={selectedAppt.clientName ?? selectedAppt.client?.firstName ?? '—'} />
                            <InfoRow icon={<IconClock size={14} />} label={`${formatTime(selectedAppt.startsAt)} — ${formatTime(selectedAppt.endsAt)} (${selectedAppt.durationMinutes} min)`} />
                            <InfoRow icon={<IconCalendar size={14} />} label={formatDate(new Date(selectedAppt.startsAt))} />
                            {selectedAppt.modality === 'online' && <InfoRow icon={<IconVideo size={14} />} label="Online" />}
                            {selectedAppt.modality === 'presential' && <InfoRow icon={<IconMapPin size={14} />} label={selectedAppt.location ?? 'Presencial'} />}
                            {selectedAppt.price && (
                                <InfoRow icon={<span className="text-[11px] font-bold">$</span>} label={`${new Intl.NumberFormat('es-CL').format(parseFloat(selectedAppt.price))} ${selectedAppt.currency}`} />
                            )}
                        </div>

                        {selectedAppt.internalNotes && (
                            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                                {selectedAppt.internalNotes}
                            </div>
                        )}

                        {/* Edit button */}
                        <button
                            onClick={handleOpenEdit}
                            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-(--bg-subtle)"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconEdit size={12} /> Editar cita
                        </button>

                        {/* Session notes */}
                        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
                                    <IconNotes size={13} /> Nota de sesión
                                </p>
                                <button
                                    onClick={() => void handleSaveNote()}
                                    disabled={noteSaving || noteLoading || noteContent === noteOriginal}
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                                    style={{ borderColor: 'var(--border)', color: noteSaved ? 'var(--accent)' : 'var(--fg-secondary)' }}
                                >
                                    {noteSaving ? <IconLoader2 size={11} className="animate-spin" /> : noteSaved ? <IconCheck size={11} /> : null}
                                    {noteSaved ? 'Guardado' : 'Guardar'}
                                </button>
                            </div>
                            {noteLoading ? (
                                <div className="flex items-center gap-1.5 text-xs py-2" style={{ color: 'var(--fg-muted)' }}>
                                    <IconLoader2 size={12} className="animate-spin" /> Cargando...
                                </div>
                            ) : (
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    rows={4}
                                    placeholder="Observaciones clínicas, evolución, temas tratados..."
                                    className="w-full text-sm resize-none outline-none rounded-xl p-3 border"
                                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                                />
                            )}
                        </div>

                        {/* Status actions */}
                        {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' && (
                            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                {selectedAppt.status !== 'completed' && (
                                    <button
                                        onClick={() => void handleStatusChange(selectedAppt, 'completed')}
                                        disabled={savingStatus === 'completed'}
                                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                        style={{ background: '#6366F1', color: '#fff' }}
                                    >
                                        {savingStatus === 'completed' ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                        Completada
                                    </button>
                                )}
                                {selectedAppt.status !== 'no_show' && (
                                    <button
                                        onClick={() => void handleStatusChange(selectedAppt, 'no_show')}
                                        disabled={savingStatus === 'no_show'}
                                        className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)', border: '1px solid var(--border)' }}
                                    >
                                        No asistió
                                    </button>
                                )}
                                <button
                                    onClick={() => void handleStatusChange(selectedAppt, 'cancelled')}
                                    disabled={savingStatus === 'cancelled'}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                    style={{ borderColor: 'var(--border)', color: '#EF4444' }}
                                    title="Cancelar cita"
                                >
                                    {savingStatus === 'cancelled' ? <IconLoader2 size={13} className="animate-spin" /> : <IconBan size={14} />}
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Edit appointment modal */}
            {showEdit && selectedAppt && (
                <Modal title="Editar cita" onClose={() => setShowEdit(false)}>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Fecha y hora</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.startsAt}
                                    onChange={(e) => setEditForm((p) => ({ ...p, startsAt: e.target.value }))}
                                    className="field-input"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Duración (min)</label>
                                <input
                                    type="number"
                                    min={15}
                                    step={5}
                                    value={editForm.durationMinutes}
                                    onChange={(e) => setEditForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                                    className="field-input"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Precio (CLP)</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="Opcional"
                                value={editForm.price}
                                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                                className="field-input"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Notas internas</label>
                            <textarea
                                value={editForm.internalNotes}
                                onChange={(e) => setEditForm((p) => ({ ...p, internalNotes: e.target.value }))}
                                rows={3}
                                placeholder="Opcional"
                                className="field-input resize-none"
                            />
                        </div>
                        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button
                                onClick={() => void handleSaveEdit()}
                                disabled={editSaving}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                {editSaving && <IconLoader2 size={14} className="animate-spin" />}
                                {editSaving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button
                                onClick={() => setShowEdit(false)}
                                className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create appointment modal */}
            {showCreate && (
                <Modal title="Nueva cita" onClose={() => setShowCreate(false)}>
                    <div className="flex flex-col gap-4">
                        {/* Client */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Paciente</label>
                            {clients.length > 0 ? (
                                <select
                                    value={form.clientId}
                                    onChange={(e) => handleClientChange(e.target.value)}
                                    className="field-input"
                                >
                                    <option value="">— Nuevo / sin ficha —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.firstName} {c.lastName ?? ''}
                                        </option>
                                    ))}
                                </select>
                            ) : null}
                            {!form.clientId && (
                                <input
                                    type="text"
                                    placeholder="Nombre del paciente *"
                                    value={form.clientName}
                                    onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                                    className="field-input"
                                />
                            )}
                        </div>

                        {/* Service */}
                        {services.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Servicio</label>
                                <select value={form.serviceId} onChange={(e) => handleServiceChange(e.target.value)} className="field-input">
                                    <option value="">— Sin servicio —</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date/time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Fecha y hora</label>
                                <input
                                    type="datetime-local"
                                    value={form.startsAt}
                                    onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                                    className="field-input"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Duración (min)</label>
                                <input
                                    type="number"
                                    min={15}
                                    step={5}
                                    value={form.durationMinutes}
                                    onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                                    className="field-input"
                                />
                            </div>
                        </div>

                        {/* Modality */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Modalidad</label>
                            <div className="flex gap-2">
                                {(['online', 'presential'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setForm((p) => ({ ...p, modality: m }))}
                                        className="flex-1 py-2 rounded-xl border text-sm transition-colors"
                                        style={{
                                            borderColor: form.modality === m ? 'var(--accent)' : 'var(--border)',
                                            color: form.modality === m ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: form.modality === m ? 600 : 400,
                                        }}
                                    >
                                        {m === 'online' ? 'Online' : 'Presencial'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Precio (CLP)</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="Opcional"
                                value={form.price}
                                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                                className="field-input"
                            />
                        </div>

                        {/* Repeat weekly */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Repetir semanalmente</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={104}
                                    placeholder="0"
                                    value={form.repeatWeekly || ''}
                                    onChange={(e) => {
                                        const v = Math.max(0, Math.min(104, Number(e.target.value) || 0));
                                        setForm((p) => ({ ...p, repeatWeekly: v }));
                                    }}
                                    className="field-input w-24"
                                />
                                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {form.repeatWeekly > 0 ? `semana${form.repeatWeekly !== 1 ? 's' : ''} (${form.repeatWeekly + 1} citas en total)` : 'semanas — sin repetición'}
                                </span>
                            </div>
                        </div>

                        {createError && (
                            <p className="text-sm" style={{ color: '#dc2626' }}>{createError}</p>
                        )}

                        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button
                                onClick={() => void handleCreate()}
                                disabled={creating}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                {creating && <IconLoader2 size={14} className="animate-spin" />}
                                {creating ? 'Guardando...' : 'Crear cita'}
                            </button>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <style>{`
                .field-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.75rem;
                    border: 1px solid var(--border);
                    background: var(--bg);
                    color: var(--fg);
                    font-size: 0.875rem;
                    outline: none;
                }
                .field-input:focus { border-color: var(--accent); }
            `}</style>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className="relative w-full max-w-md rounded-2xl border p-5 max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                        <IconX size={14} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
            <span style={{ color: 'var(--fg-muted)' }}>{icon}</span>
            {label}
        </div>
    );
}
