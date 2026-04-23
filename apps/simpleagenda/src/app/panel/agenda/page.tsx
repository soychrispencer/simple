'use client';

import { useEffect, useState, useCallback, useRef, useId } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
    IconSearch,
    IconLayoutGrid,
    IconLayoutColumns,
    IconLayoutList,
    IconRepeat,
    IconHeart,
    IconCopy,
    IconBrandWhatsapp,
    IconUsersGroup,
} from '@tabler/icons-react';
import {
    fetchAgendaAppointments,
    createAgendaAppointment,
    patchAppointmentStatus,
    cancelAppointmentSeries,
    updateAgendaAppointment,
    fetchAgendaServices,
    fetchAgendaClients,
    fetchAgendaLocations,
    fetchAgendaNote,
    saveAgendaNote,
    fetchAgendaProfile,
    createNpsTokenForAppointment,
    fetchClientPacks,
    fetchGroupSessions,
    type AgendaAppointment,
    type AgendaService,
    type AgendaClient,
    type AgendaLocation,
    type AgendaProfile,
    type AgendaClientPack,
    type AgendaGroupSession,
} from '@/lib/agenda-api';
import { fmtDateShort as formatDate, fmtTime as formatTime, fmtDateTz } from '@/lib/format';
import { vocab } from '@/lib/vocabulary';
import { useEscapeClose } from '@/lib/use-modal-a11y';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeTz(iso: string, tz: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
    });
}

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

function isoDateInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
type ViewMode = 'day' | 'week' | 'month';

const DAY_VIEW_HOUR_START = 7;
const DAY_VIEW_HOUR_END = 22;
const DAY_VIEW_HOUR_HEIGHT = 56;

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgendaPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [view, setView] = useState<ViewMode>('week');
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [monthDate, setMonthDate] = useState(() => new Date());
    const [dayDate, setDayDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [groupSessions, setGroupSessions] = useState<AgendaGroupSession[]>([]);
    const [onlySeries, setOnlySeries] = useState(false);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [locations, setLocations] = useState<AgendaLocation[]>([]);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [clientDropOpen, setClientDropOpen] = useState(false);
    const clientDropRef = useRef<HTMLDivElement>(null);

    // Modal states
    const [showCreate, setShowCreate] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<AgendaAppointment | null>(null);
    const [savingStatus, setSavingStatus] = useState<string | null>(null);
    const [statusError, setStatusError] = useState<string | null>(null);

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

    // Cancel confirmation
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

    // NPS share link (per appointment, lazy)
    const [npsToken, setNpsToken] = useState<string | null>(null);
    const [npsLoading, setNpsLoading] = useState(false);
    const [npsCopied, setNpsCopied] = useState(false);

    useEffect(() => {
        setNpsToken(null);
        setNpsCopied(false);
    }, [selectedAppt?.id]);

    const handleGenerateNpsLink = useCallback(async () => {
        if (!selectedAppt || selectedAppt.status !== 'completed') return;
        setNpsLoading(true);
        const token = await createNpsTokenForAppointment(selectedAppt.id);
        setNpsLoading(false);
        if (token) setNpsToken(token);
    }, [selectedAppt]);

    const npsShareUrl = npsToken && typeof window !== 'undefined'
        ? `${window.location.origin}/nps/${npsToken}`
        : '';

    const handleCopyNps = useCallback(async () => {
        if (!npsShareUrl) return;
        try {
            await navigator.clipboard.writeText(npsShareUrl);
            setNpsCopied(true);
            setTimeout(() => setNpsCopied(false), 2000);
        } catch {
            /* noop */
        }
    }, [npsShareUrl]);

    // Create form
    const [form, setForm] = useState({
        clientId: '',
        clientName: '',
        clientEmail: '',
        serviceId: '',
        startsAt: isoDateInput(new Date()),
        durationMinutes: 50,
        modality: 'online',
        location: '',
        price: '',
        internalNotes: '',
        recurrenceFrequency: 'none' as 'none' | 'weekly' | 'biweekly' | 'monthly',
        recurrenceCount: 1,
        clientPackId: '',
    });
    const [activeClientPacks, setActiveClientPacks] = useState<AgendaClientPack[]>([]);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const filteredClients = clients.filter((c) => {
        const q = clientSearch.toLowerCase();
        if (!q) return true;
        return `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(q) ||
            (c.email ?? '').toLowerCase().includes(q) ||
            (c.phone ?? '').includes(q);
    });

    const load = useCallback(async () => {
        setLoading(true);
        const wEnd = addDays(weekStart, 6); wEnd.setHours(23, 59, 59, 999);
        const dayEnd = new Date(dayDate); dayEnd.setHours(23, 59, 59, 999);
        const from =
            view === 'month' ? getMonthStart(monthDate).toISOString() :
            view === 'day'   ? dayDate.toISOString() :
            weekStart.toISOString();
        const to =
            view === 'month' ? getMonthEnd(monthDate).toISOString() :
            view === 'day'   ? dayEnd.toISOString() :
            wEnd.toISOString();
        const [appts, svcs, groups] = await Promise.all([
            fetchAgendaAppointments(from, to),
            fetchAgendaServices(),
            fetchGroupSessions(),
        ]);
        setAppointments(appts);
        setServices(svcs);
        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime();
        setGroupSessions(groups.filter((g) => {
            const t = new Date(g.startsAt).getTime();
            return t >= fromMs && t <= toMs;
        }));
        setLoading(false);
    }, [view, weekStart, monthDate, dayDate]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { void load(); }, [load]);

    // Restore view preference + mobile-first default
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem('simpleagenda:agenda-view');
        if (stored === 'day' || stored === 'week' || stored === 'month') {
            setView(stored);
        } else if (window.matchMedia('(max-width: 640px)').matches) {
            setView('day');
        }
    }, []);

    const changeView = (next: ViewMode) => {
        setView(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('simpleagenda:agenda-view', next);
        }
    };

    // Load clients, locations, and profile once on mount
    useEffect(() => {
        void fetchAgendaClients().then(setClients);
        void fetchAgendaLocations().then(setLocations);
        void fetchAgendaProfile().then(setProfile);
    }, []);

    // Close client dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clientDropRef.current && !clientDropRef.current.contains(e.target as Node)) {
                setClientDropOpen(false);
            }
        };
        if (clientDropOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [clientDropOpen]);

    // Open create modal if ?nueva=1 is in the URL
    useEffect(() => {
        if (searchParams.get('nueva') === '1') {
            handleCreateOpen();
            router.replace('/panel/agenda');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Helper: local YYYY-MM-DD key from any Date
    const localKey = (d: Date) => {
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    // Group appointments by local YYYY-MM-DD (applying series + search + status filters)
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const visibleAppointments = appointments.filter((a) => {
        if (onlySeries && !a.seriesId) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (normalizedQuery) {
            const svc = services.find((s) => s.id === a.serviceId);
            const haystack = [
                a.clientName ?? '',
                a.clientEmail ?? '',
                a.clientPhone ?? '',
                svc?.name ?? '',
            ].join(' ').toLowerCase();
            if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
    });
    const seriesCount = appointments.reduce((n, a) => n + (a.seriesId ? 1 : 0), 0);
    const filtersActive = !!normalizedQuery || statusFilter !== 'all';
    const byDay: AppointmentsByDay = {};
    for (const appt of visibleAppointments) {
        const key = localKey(new Date(appt.startsAt));
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(appt);
    }

    const groupByDay: Record<string, AgendaGroupSession[]> = {};
    for (const gs of groupSessions) {
        if (gs.status === 'cancelled') continue;
        const key = localKey(new Date(gs.startsAt));
        if (!groupByDay[key]) groupByDay[key] = [];
        groupByDay[key].push(gs);
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const monthGridDays = getMonthGridDays(monthDate);

    const handlePrevWeek = () => setWeekStart((d) => addDays(d, -7));
    const handleNextWeek = () => setWeekStart((d) => addDays(d, 7));
    const handleToday = () => {
        const today = new Date();
        setWeekStart(getWeekStart(today));
        setMonthDate(today);
        const dayToday = new Date(today); dayToday.setHours(0,0,0,0);
        setDayDate(dayToday);
    };
    const handlePrevMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const handleNextMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const handlePrevDay = () => setDayDate((d) => addDays(d, -1));
    const handleNextDay = () => setDayDate((d) => addDays(d, 1));

    const handlePrev = () => {
        if (view === 'day') handlePrevDay();
        else if (view === 'month') handlePrevMonth();
        else handlePrevWeek();
    };
    const handleNext = () => {
        if (view === 'day') handleNextDay();
        else if (view === 'month') handleNextMonth();
        else handleNextWeek();
    };

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
            location: '',
            price: services[0]?.price ?? '',
            internalNotes: '',
            recurrenceFrequency: 'none',
            recurrenceCount: 1,
            clientPackId: '',
        });
        setActiveClientPacks([]);
        setClientSearch('');
        setClientDropOpen(false);
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
            clientPackId: '',
        }));
        if (clientId) {
            void fetchClientPacks({ clientId, status: 'active' }).then(setActiveClientPacks);
        } else {
            setActiveClientPacks([]);
        }
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!form.clientName.trim() && !form.clientId) {
            setCreateError(`Indica el nombre del ${vocab.client} o selecciona uno existente.`);
            return;
        }
        setCreating(true);
        const { recurrenceFrequency, recurrenceCount, ...restForm } = form;
        const recurring = recurrenceFrequency !== 'none';
        const result = await createAgendaAppointment({
            ...restForm,
            clientId: form.clientId || null,
            clientName: form.clientName || null,
            clientEmail: form.clientEmail || null,
            serviceId: form.serviceId || null,
            location: form.modality === 'presential' ? (form.location || null) : null,
            price: form.clientPackId ? null : (form.price || null),
            recurrenceFrequency: recurring ? recurrenceFrequency : undefined,
            recurrenceCount: recurring ? Math.max(2, Math.min(52, recurrenceCount)) : undefined,
            clientPackId: form.clientPackId || null,
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
        // Convert UTC ISO to local datetime-local string
        const localDt = new Date(selectedAppt.startsAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        const localStr = `${localDt.getFullYear()}-${pad(localDt.getMonth() + 1)}-${pad(localDt.getDate())}T${pad(localDt.getHours())}:${pad(localDt.getMinutes())}`;
        setEditForm({
            startsAt: localStr,
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
            setShowEdit(false);
            await load();
        }
    };

    const handleStatusChange = async (appt: AgendaAppointment, status: string) => {
        const prevStatus = appt.status;
        // Optimistic update
        setSelectedAppt((prev) => prev ? { ...prev, status } : null);
        setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status } : a));
        setConfirmCancelId(null);
        setSavingStatus(status);
        setStatusError(null);

        const result = await patchAppointmentStatus(appt.id, status);
        setSavingStatus(null);

        if (!result.ok) {
            // Revert
            setSelectedAppt((prev) => prev ? { ...prev, status: prevStatus } : null);
            setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: prevStatus } : a));
            setStatusError(result.error ?? 'No se pudo guardar el cambio.');
        }
    };

    const handleCancelSeries = async (appt: AgendaAppointment, scope: 'future' | 'all') => {
        setSavingStatus('cancelled');
        const result = await cancelAppointmentSeries(appt.id, scope);
        setSavingStatus(null);
        setConfirmCancelId(null);
        if (!result.ok || !appt.seriesId) return;
        const anchorTime = new Date(appt.startsAt).getTime();
        setAppointments((prev) => prev.map((a) => {
            if (a.seriesId !== appt.seriesId) return a;
            if (a.status !== 'confirmed' && a.status !== 'pending') return a;
            if (scope === 'future' && new Date(a.startsAt).getTime() < anchorTime) return a;
            return { ...a, status: 'cancelled' };
        }));
        setSelectedAppt((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    };

    const weekEnd = addDays(weekStart, 6);
    const todayKey = localKey(new Date());
    const weekLabel = `${weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const monthLabel = monthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const dayLabel = dayDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const headerLabel = view === 'day' ? dayLabel : view === 'month' ? monthLabel : weekLabel;
    const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Day view computations
    const dayKey = localKey(dayDate);
    const dayAppts = (byDay[dayKey] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const dayGroups = (groupByDay[dayKey] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const dayHours = Array.from({ length: DAY_VIEW_HOUR_END - DAY_VIEW_HOUR_START + 1 }, (_, i) => DAY_VIEW_HOUR_START + i);
    const isDayToday = dayKey === todayKey;
    const nowMinutes = isDayToday ? (new Date().getHours() * 60 + new Date().getMinutes()) : null;

    return (
        <div className="container-app panel-page py-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Mi Agenda</h1>
                    <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--fg-muted)' }}>
                        {headerLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View toggle */}
                    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                        <button
                            onClick={() => changeView('day')}
                            aria-pressed={view === 'day'}
                            className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                            style={{ background: view === 'day' ? 'var(--accent)' : 'transparent', color: view === 'day' ? '#fff' : 'var(--fg-muted)' }}
                        >
                            <IconLayoutList size={13} /> Día
                        </button>
                        <button
                            onClick={() => changeView('week')}
                            aria-pressed={view === 'week'}
                            className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                            style={{ background: view === 'week' ? 'var(--accent)' : 'transparent', color: view === 'week' ? '#fff' : 'var(--fg-muted)' }}
                        >
                            <IconLayoutColumns size={13} /> Semana
                        </button>
                        <button
                            onClick={() => changeView('month')}
                            aria-pressed={view === 'month'}
                            className="px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                            style={{ background: view === 'month' ? 'var(--accent)' : 'transparent', color: view === 'month' ? '#fff' : 'var(--fg-muted)' }}
                        >
                            <IconLayoutGrid size={13} /> Mes
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSearchOpen((v) => !v)}
                        aria-pressed={searchOpen}
                        aria-label="Buscar y filtrar"
                        className="relative w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                        style={{
                            borderColor: searchOpen || filtersActive ? 'var(--accent)' : 'var(--border)',
                            background: searchOpen ? 'var(--accent-soft)' : 'transparent',
                            color: searchOpen || filtersActive ? 'var(--accent)' : 'var(--fg-muted)',
                        }}
                    >
                        <IconSearch size={14} />
                        {filtersActive && !searchOpen && (
                            <span
                                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                                style={{ background: 'var(--accent)' }}
                            />
                        )}
                    </button>
                    {seriesCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setOnlySeries((v) => !v)}
                            aria-pressed={onlySeries}
                            title={onlySeries ? 'Mostrar todas' : 'Ver solo series recurrentes'}
                            className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition-colors"
                            style={{
                                borderColor: onlySeries ? 'var(--accent)' : 'var(--border)',
                                background: onlySeries ? 'var(--accent-soft)' : 'transparent',
                                color: onlySeries ? 'var(--accent)' : 'var(--fg-secondary)',
                                fontWeight: onlySeries ? 600 : 400,
                            }}
                        >
                            <IconRepeat size={13} />
                            {onlySeries ? 'Solo series' : 'Series'}
                        </button>
                    )}
                    <button onClick={handleToday} className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-(--bg-subtle)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                        Hoy
                    </button>
                    <button
                        onClick={handlePrev}
                        aria-label="Anterior"
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                        <IconChevronLeft size={16} />
                    </button>
                    <button
                        onClick={handleNext}
                        aria-label="Siguiente"
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

            {/* Search & filters bar */}
            {searchOpen && (
                <div
                    className="rounded-2xl border p-3 mb-3 flex flex-col sm:flex-row gap-2"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="relative flex-1">
                        <IconSearch
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: 'var(--fg-muted)' }}
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Buscar por ${vocab.client}, email, teléfono o servicio...`}
                            className="field-input pl-9 pr-9"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-(--bg-subtle)"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={13} />
                            </button>
                        )}
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="field-input sm:w-44"
                        aria-label="Filtrar por estado"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="no_show">No asistió</option>
                    </select>
                    {filtersActive && (
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                            className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-(--bg-subtle) self-stretch sm:self-auto"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            )}

            {/* Active-filter summary */}
            {!searchOpen && filtersActive && (
                <div
                    className="rounded-xl border px-3 py-2 mb-3 flex items-center justify-between gap-2 text-xs"
                    style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                    <span className="truncate">
                        {visibleAppointments.length} {visibleAppointments.length === 1 ? 'cita' : 'citas'} con filtros activos
                    </span>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="px-2 py-0.5 rounded-md text-xs font-medium transition-opacity hover:opacity-70"
                    >
                        Limpiar
                    </button>
                </div>
            )}

            {/* Day view — vertical timeline */}
            {view === 'day' && (
                <div
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="relative" style={{ height: dayHours.length * DAY_VIEW_HOUR_HEIGHT }}>
                        {/* Hour grid */}
                        {dayHours.map((h, i) => (
                            <div
                                key={h}
                                className="absolute left-0 right-0 flex items-start"
                                style={{ top: i * DAY_VIEW_HOUR_HEIGHT, height: DAY_VIEW_HOUR_HEIGHT, borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                            >
                                <span
                                    className="w-14 sm:w-16 shrink-0 text-[10px] font-medium pt-1 pl-3 tabular-nums"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    {String(h).padStart(2, '0')}:00
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slot = new Date(dayDate);
                                        slot.setHours(h, 0, 0, 0);
                                        handleCreateOpen(slot);
                                    }}
                                    className="flex-1 h-full transition-colors hover:bg-[--accent-soft]"
                                    aria-label={`Crear cita a las ${h}:00`}
                                />
                            </div>
                        ))}

                        {/* Now line */}
                        {nowMinutes !== null && nowMinutes >= DAY_VIEW_HOUR_START * 60 && nowMinutes <= DAY_VIEW_HOUR_END * 60 && (
                            <div
                                className="absolute left-14 sm:left-16 right-0 pointer-events-none z-10"
                                style={{ top: ((nowMinutes - DAY_VIEW_HOUR_START * 60) / 60) * DAY_VIEW_HOUR_HEIGHT }}
                                aria-label="Hora actual"
                            >
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full -ml-1" style={{ background: 'var(--accent)' }} />
                                    <div className="flex-1 h-px" style={{ background: 'var(--accent)' }} />
                                </div>
                            </div>
                        )}

                        {/* Group sessions */}
                        {!loading && dayGroups.map((gs) => {
                            const start = new Date(gs.startsAt);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const top = ((startMin - DAY_VIEW_HOUR_START * 60) / 60) * DAY_VIEW_HOUR_HEIGHT;
                            const height = Math.max((gs.durationMinutes / 60) * DAY_VIEW_HOUR_HEIGHT - 2, 24);
                            if (top < -DAY_VIEW_HOUR_HEIGHT || top > dayHours.length * DAY_VIEW_HOUR_HEIGHT) return null;
                            return (
                                <button
                                    key={gs.id}
                                    onClick={(e) => { e.stopPropagation(); router.push(`/panel/configuracion/grupales/${gs.id}`); }}
                                    className="absolute left-14 sm:left-16 right-2 rounded-lg px-2.5 py-1.5 text-left transition-opacity hover:opacity-90 z-20 overflow-hidden"
                                    style={{
                                        top,
                                        height,
                                        background: '#8b5cf6',
                                        color: '#fff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <p className="text-xs font-semibold truncate flex items-center gap-1">
                                        <IconUsersGroup size={11} /> {formatTime(gs.startsAt)} · {gs.title}
                                    </p>
                                    {height > 36 && (
                                        <p className="text-[10px] opacity-90 truncate">
                                            {(gs.attendeeCount ?? 0)}/{gs.capacity} asistentes
                                        </p>
                                    )}
                                </button>
                            );
                        })}

                        {/* Appointments */}
                        {!loading && dayAppts.map((appt) => {
                            const start = new Date(appt.startsAt);
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const top = ((startMin - DAY_VIEW_HOUR_START * 60) / 60) * DAY_VIEW_HOUR_HEIGHT;
                            const height = Math.max((appt.durationMinutes / 60) * DAY_VIEW_HOUR_HEIGHT - 2, 24);
                            if (top < -DAY_VIEW_HOUR_HEIGHT || top > dayHours.length * DAY_VIEW_HOUR_HEIGHT) return null;
                            const color = STATUS_COLORS[appt.status] ?? 'var(--accent)';
                            return (
                                <button
                                    key={appt.id}
                                    onClick={() => void handleSelectAppt(appt)}
                                    className="absolute left-14 sm:left-16 right-2 rounded-lg px-2.5 py-1.5 text-left transition-opacity hover:opacity-90 z-20 overflow-hidden"
                                    style={{
                                        top,
                                        height,
                                        background: color,
                                        color: '#fff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <p className="text-xs font-semibold truncate">
                                        {formatTime(appt.startsAt)} · {appt.clientName ?? `${vocab.client} sin nombre`}
                                    </p>
                                    {height > 36 && (() => {
                                        const svc = services.find((s) => s.id === appt.serviceId);
                                        return svc ? <p className="text-[10px] opacity-90 truncate">{svc.name}</p> : null;
                                    })()}
                                </button>
                            );
                        })}

                        {/* Loading skeletons */}
                        {loading && (
                            <div className="absolute inset-0 left-14 sm:left-16 p-2 flex flex-col gap-2 pointer-events-none" aria-hidden="true">
                                <div className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />
                                <div className="h-10 rounded-lg animate-pulse opacity-60" style={{ background: 'var(--border)' }} />
                                <div className="h-10 rounded-lg animate-pulse opacity-40" style={{ background: 'var(--border)' }} />
                            </div>
                        )}
                    </div>

                    {/* Empty state for day */}
                    {!loading && dayAppts.length === 0 && (
                        <div
                            className="text-center py-6 text-xs border-t"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                        >
                            Sin citas este día. Toca un horario para crear una.
                        </div>
                    )}
                </div>
            )}

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
                            const key = localKey(day);
                            const isToday = key === todayKey;
                            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
                            const dayAppts = (byDay[key] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                            const dayGroups = (groupByDay[key] ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                            const combined = [
                                ...dayGroups.map((g) => ({ kind: 'group' as const, data: g, sortKey: g.startsAt })),
                                ...dayAppts.map((a) => ({ kind: 'appt' as const, data: a, sortKey: a.startsAt })),
                            ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
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
                                    {loading ? null : combined.slice(0, 3).map((item) => item.kind === 'group' ? (
                                        <button
                                            key={`g-${item.data.id}`}
                                            onClick={(e) => { e.stopPropagation(); router.push(`/panel/configuracion/grupales/${item.data.id}`); }}
                                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 transition-opacity hover:opacity-80 flex items-center gap-1"
                                            style={{ background: '#8b5cf6', color: '#fff' }}
                                        >
                                            <IconUsersGroup size={10} />
                                            {profile ? formatTimeTz(item.data.startsAt, profile.timezone) : formatTime(item.data.startsAt)} {item.data.title}
                                        </button>
                                    ) : (() => {
                                        const appt = item.data;
                                        return (
                                        <button
                                            key={appt.id}
                                            onClick={(e) => { e.stopPropagation(); void handleSelectAppt(appt); }}
                                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate mb-0.5 transition-opacity hover:opacity-80"
                                            style={{ background: STATUS_COLORS[appt.status] ?? 'var(--accent)', color: '#fff' }}
                                        >
                                            {profile ? formatTimeTz(appt.startsAt, profile.timezone) : formatTime(appt.startsAt)} {appt.clientName ?? appt.client?.firstName ?? '—'}
                                        </button>
                                        );
                                    })())}
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
                        const key = localKey(day);
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
                        const key = localKey(day);
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
                                    <div className="flex flex-col gap-1.5 mt-2" aria-hidden="true">
                                        <div className="h-7 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />
                                        <div className="h-7 rounded-lg animate-pulse opacity-60" style={{ background: 'var(--border)' }} />
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
                                            {profile ? formatTimeTz(appt.startsAt, profile.timezone) : formatTime(appt.startsAt)}
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
                <Modal title="Detalle de cita" onClose={() => { setSelectedAppt(null); setStatusError(null); }}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                                style={{ background: STATUS_COLORS[selectedAppt.status] ?? 'var(--accent)' }}
                            >
                                {STATUS_LABELS[selectedAppt.status] ?? selectedAppt.status}
                            </span>
                            {selectedAppt.seriesId && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                    {selectedAppt.recurrenceFrequency === 'biweekly' ? 'Serie quincenal' : selectedAppt.recurrenceFrequency === 'monthly' ? 'Serie mensual' : 'Serie semanal'}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <InfoRow icon={<IconUser size={14} />} label={selectedAppt.clientName ?? selectedAppt.client?.firstName ?? '—'} />
                            <InfoRow icon={<IconClock size={14} />} label={`${profile ? formatTimeTz(selectedAppt.startsAt, profile.timezone) : formatTime(selectedAppt.startsAt)} — ${profile ? formatTimeTz(selectedAppt.endsAt, profile.timezone) : formatTime(selectedAppt.endsAt)} (${selectedAppt.durationMinutes} min)`} />
                            <InfoRow icon={<IconCalendar size={14} />} label={profile ? fmtDateTz(selectedAppt.startsAt, profile.timezone) : formatDate(new Date(selectedAppt.startsAt))} />
                            {selectedAppt.modality === 'online' && (
                                <>
                                    <InfoRow icon={<IconVideo size={14} />} label="Online" />
                                    {selectedAppt.meetingUrl && (
                                        <a
                                            href={selectedAppt.meetingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-(--bg-subtle)"
                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                                        >
                                            <IconVideo size={12} /> Unirse a Google Meet
                                        </a>
                                    )}
                                </>
                            )}
                            {selectedAppt.modality === 'presential' && <InfoRow icon={<IconMapPin size={14} />} label={selectedAppt.location ?? 'Presencial'} />}
                            {selectedAppt.price && (
                                <InfoRow icon={<span className="text-[11px] font-bold">$</span>} label={new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(parseFloat(selectedAppt.price))} />
                            )}
                        </div>

                        {selectedAppt.internalNotes && (
                            <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                                {selectedAppt.internalNotes}
                            </div>
                        )}

                        {selectedAppt.preconsultResponses && selectedAppt.preconsultResponses.length > 0 && (
                            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg)' }}>Pre-consulta</p>
                                <div className="flex flex-col gap-2">
                                    {selectedAppt.preconsultResponses.map((r, i) => (
                                        <div key={i} className="p-2.5 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                            <p className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>{r.label}</p>
                                            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{r.value || <span style={{ color: 'var(--fg-muted)' }}>—</span>}</p>
                                        </div>
                                    ))}
                                </div>
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
                                    className="field-input resize-none"
                                />
                            )}
                        </div>

                        {/* Inline error from optimistic revert */}
                        {statusError && (
                            <div
                                role="alert"
                                className="rounded-xl border px-3 py-2 text-xs"
                                style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: '#dc2626' }}
                            >
                                {statusError}
                            </div>
                        )}

                        {/* Status actions */}
                        {selectedAppt.status !== 'cancelled' && selectedAppt.status !== 'completed' && (
                            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex gap-2">
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
                                        type="button"
                                        aria-label="Cancelar cita"
                                        onClick={() => setConfirmCancelId(selectedAppt.id)}
                                        disabled={!!savingStatus}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                        style={{ borderColor: 'var(--border)', color: '#EF4444' }}
                                        title="Cancelar cita"
                                    >
                                        <IconBan size={14} />
                                    </button>
                                </div>
                                {confirmCancelId === selectedAppt.id && !selectedAppt.seriesId && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <span className="flex-1" style={{ color: 'var(--fg)' }}>¿Cancelar esta cita?</span>
                                        <button
                                            onClick={() => { setConfirmCancelId(null); void handleStatusChange(selectedAppt, 'cancelled'); }}
                                            disabled={savingStatus === 'cancelled'}
                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                                            style={{ background: '#EF4444', color: '#fff' }}
                                        >
                                            {savingStatus === 'cancelled' ? <IconLoader2 size={11} className="animate-spin" /> : 'Sí, cancelar'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmCancelId(null)}
                                            className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            No
                                        </button>
                                    </div>
                                )}

                                {confirmCancelId === selectedAppt.id && selectedAppt.seriesId && (
                                    <div className="flex flex-col gap-2 px-3 py-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <p style={{ color: 'var(--fg)' }}>Esta cita es parte de una serie. ¿Qué quieres cancelar?</p>
                                        <div className="flex flex-col gap-1.5">
                                            <button
                                                onClick={() => { void handleStatusChange(selectedAppt, 'cancelled'); }}
                                                disabled={!!savingStatus}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-500/10"
                                                style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
                                            >
                                                Solo esta cita
                                            </button>
                                            <button
                                                onClick={() => { void handleCancelSeries(selectedAppt, 'future'); }}
                                                disabled={!!savingStatus}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-500/10"
                                                style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
                                            >
                                                Esta y todas las futuras
                                            </button>
                                            <button
                                                onClick={() => { void handleCancelSeries(selectedAppt, 'all'); }}
                                                disabled={!!savingStatus}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-500/10"
                                                style={{ border: '1px solid #EF4444', color: '#EF4444' }}
                                            >
                                                Toda la serie
                                            </button>
                                            <button
                                                onClick={() => setConfirmCancelId(null)}
                                                className="w-full text-center px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-(--bg-subtle)"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                Volver
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NPS — share post-visit survey link (solo si completada) */}
                        {selectedAppt.status === 'completed' && (
                            <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-7 h-7 rounded-lg border flex items-center justify-center"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        <IconHeart size={13} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Encuesta de satisfacción</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            Comparte el enlace para que tu paciente responda.
                                        </p>
                                    </div>
                                </div>
                                {!npsToken ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleGenerateNpsLink()}
                                        disabled={npsLoading}
                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                    >
                                        {npsLoading ? <IconLoader2 size={13} className="animate-spin" /> : <IconHeart size={13} />}
                                        Generar enlace NPS
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <div
                                            className="px-3 py-2 rounded-xl border text-xs break-all font-mono"
                                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}
                                        >
                                            {npsShareUrl}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleCopyNps()}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors hover:bg-(--bg-subtle)"
                                                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                                                aria-label="Copiar enlace NPS"
                                            >
                                                {npsCopied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                                                {npsCopied ? 'Copiado' : 'Copiar enlace'}
                                            </button>
                                            {selectedAppt.clientPhone ? (
                                                <a
                                                    href={`https://wa.me/${selectedAppt.clientPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola, ¿nos ayudas con una breve encuesta sobre tu última cita? ${npsShareUrl}`)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                                                    style={{ background: '#25D366', color: '#fff' }}
                                                    aria-label="Enviar por WhatsApp"
                                                >
                                                    <IconBrandWhatsapp size={14} />
                                                </a>
                                            ) : null}
                                        </div>
                                    </div>
                                )}
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
                <Modal title="Nueva cita" onClose={() => { setShowCreate(false); setClientSearch(''); setClientDropOpen(false); }}>
                    <div className="flex flex-col gap-4">
                        {/* Client — searchable combobox */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{vocab.Client}</label>
                            {clients.length > 0 ? (
                                <div ref={clientDropRef} className="relative">
                                    {/* Selected display or search input */}
                                    {form.clientId ? (
                                        <div className="field-input flex items-center justify-between gap-2">
                                            <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>
                                                {clients.find((c) => c.id === form.clientId)?.firstName} {clients.find((c) => c.id === form.clientId)?.lastName ?? ''}
                                            </span>
                                            <button
                                                onClick={() => { handleClientChange(''); setClientSearch(''); }}
                                                className="shrink-0 text-xs"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                <IconX size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <IconSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
                                            <input
                                                type="text"
                                                value={clientSearch}
                                                onChange={(e) => { setClientSearch(e.target.value); setClientDropOpen(true); }}
                                                onFocus={() => setClientDropOpen(true)}
                                                placeholder={`Buscar ${vocab.client} existente...`}
                                                className="field-input pl-8"
                                            />
                                        </div>
                                    )}
                                    {/* Dropdown list */}
                                    {clientDropOpen && !form.clientId && (
                                        <div
                                            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border max-h-48 overflow-y-auto"
                                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                        >
                                            <button
                                                onClick={() => { handleClientChange(''); setClientDropOpen(false); setClientSearch(''); }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-(--bg-subtle) transition-colors"
                                                style={{ color: 'var(--fg-muted)' }}
                                            >
                                                — Nuevo / sin ficha —
                                            </button>
                                            {filteredClients.length === 0 ? (
                                                <p className="px-3 py-2 text-xs" style={{ color: 'var(--fg-muted)' }}>Sin resultados</p>
                                            ) : filteredClients.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { handleClientChange(c.id); setClientDropOpen(false); setClientSearch(''); }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-(--bg-subtle) transition-colors"
                                                    style={{ color: 'var(--fg)' }}
                                                >
                                                    <span className="font-medium">{c.firstName} {c.lastName ?? ''}</span>
                                                    {(c.email || c.phone) && (
                                                        <span className="ml-1.5" style={{ color: 'var(--fg-muted)' }}>{c.email ?? c.phone}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                            {!form.clientId && (
                                <input
                                    type="text"
                                    placeholder={`Nombre del ${vocab.client} *`}
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

                        {/* Location (presential only) */}
                        {form.modality === 'presential' && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Ubicación</label>
                                {locations.length > 0 ? (
                                    <select
                                        value={form.location}
                                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                        className="field-input"
                                    >
                                        <option value="">— Sin especificar —</option>
                                        {locations.filter((l) => l.isActive).map((l) => (
                                            <option key={l.id} value={l.addressLine}>
                                                {l.name}{l.addressLine ? ` — ${l.addressLine}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Dirección o nombre del lugar"
                                        value={form.location}
                                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                        className="field-input"
                                    />
                                )}
                            </div>
                        )}

                        {/* Bono / pack del cliente */}
                        {form.clientId && activeClientPacks.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Usar bono del cliente</label>
                                <select
                                    value={form.clientPackId}
                                    onChange={(e) => setForm((p) => ({ ...p, clientPackId: e.target.value }))}
                                    className="field-input"
                                >
                                    <option value="">No usar bono</option>
                                    {activeClientPacks.map((cp) => {
                                        const remaining = cp.sessionsTotal - cp.sessionsUsed;
                                        return (
                                            <option key={cp.id} value={cp.id}>
                                                {cp.name} — {remaining} sesión(es) disponibles
                                            </option>
                                        );
                                    })}
                                </select>
                                {form.clientPackId && (
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        Se descontará una sesión del bono{form.recurrenceFrequency !== 'none' ? ` por cada cita de la serie (${form.recurrenceCount} en total)` : ''}. No se cobrará precio.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Price */}
                        {!form.clientPackId && (
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
                        )}

                        {/* Recurrence */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>¿Se repite?</label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={form.recurrenceFrequency}
                                    onChange={(e) => setForm((p) => ({ ...p, recurrenceFrequency: e.target.value as typeof p.recurrenceFrequency, recurrenceCount: e.target.value === 'none' ? 1 : Math.max(2, p.recurrenceCount) }))}
                                    className="field-input"
                                >
                                    <option value="none">No se repite</option>
                                    <option value="weekly">Cada semana</option>
                                    <option value="biweekly">Cada dos semanas</option>
                                    <option value="monthly">Cada mes</option>
                                </select>
                                {form.recurrenceFrequency !== 'none' && (
                                    <>
                                        <input
                                            type="number"
                                            min={2}
                                            max={52}
                                            value={form.recurrenceCount}
                                            onChange={(e) => {
                                                const v = Math.max(2, Math.min(52, Number(e.target.value) || 2));
                                                setForm((p) => ({ ...p, recurrenceCount: v }));
                                            }}
                                            className="field-input w-16 text-center"
                                        />
                                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                                            sesiones en total
                                        </span>
                                    </>
                                )}
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
                                onClick={() => { setShowCreate(false); setClientSearch(''); setClientDropOpen(false); }}
                                className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    const titleId = useId();
    useEscapeClose(true, onClose);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className="relative w-full max-w-md rounded-2xl border p-5 max-h-[90vh] overflow-y-auto"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 id={titleId} className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>
                    <button
                        type="button"
                        aria-label="Cerrar"
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
