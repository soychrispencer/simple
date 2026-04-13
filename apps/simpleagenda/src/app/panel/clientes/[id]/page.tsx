'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconCalendar,
    IconLoader2,
    IconCheck,
    IconNotes,
    IconChevronDown,
    IconVideo,
    IconMapPin,
} from '@tabler/icons-react';
import { fetchAgendaClient, updateAgendaClient, type AgendaClient, type AgendaAppointment } from '@/lib/agenda-api';
import { fmtDateLong as formatDate, fmtTime as formatTime } from '@/lib/format';

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

export default function ClienteFichaPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<AgendaClient | null>(null);
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

    const toggleApptNotes = (apptId: string) => {
        setExpandedNotes((prev) => {
            const next = new Set(prev);
            if (next.has(apptId)) next.delete(apptId); else next.add(apptId);
            return next;
        });
    };

    useEffect(() => {
        const load = async () => {
            const data = await fetchAgendaClient(id);
            if (!data) { router.push('/panel/clientes'); return; }
            setClient(data.client);
            setAppointments(data.appointments);
            setNotes(data.client.internalNotes ?? '');
            setLoading(false);
        };
        void load();
    }, [id, router]);

    const handleSaveNotes = async () => {
        if (!client) return;
        setSaving(true);
        await updateAgendaClient(client.id, { internalNotes: notes });
        setSaving(false);
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
    };

    if (loading) {
        return (
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando ficha...
            </div>
        );
    }

    if (!client) return null;

    const fullName = `${client.firstName} ${client.lastName ?? ''}`.trim();
    const initials = `${client.firstName.charAt(0)}${(client.lastName ?? '').charAt(0)}`.toUpperCase();
    const sortedAppts = [...appointments].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    const age = client.dateOfBirth ? (() => {
        const dob = new Date(client.dateOfBirth);
        const today = new Date();
        let a = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
        return a;
    })() : null;
    const completedAppts = appointments.filter((a) => a.status === 'completed');
    const totalPaid = completedAppts.reduce((sum, a) => sum + (a.price ? parseFloat(a.price) : 0), 0);

    return (
        <div className="container-app panel-page py-8 max-w-3xl">
            {/* Back */}
            <button
                onClick={() => router.push('/panel/clientes')}
                className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
                style={{ color: 'var(--fg-muted)' }}
            >
                <IconArrowLeft size={14} />
                Volver a pacientes
            </button>

            {/* Header card */}
            <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-start gap-4">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{fullName}</h1>
                        {client.city && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{client.city}</p>}
                    </div>
                </div>
            </div>

            <div className={`grid gap-4 mb-6 ${age !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                <StatCard label="Sesiones" value={String(completedAppts.length)} />
                <StatCard label="Total cobrado" value={totalPaid > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalPaid) : '$0'} />
                <StatCard label="Primera cita" value={sortedAppts.length > 0 ? formatDate(sortedAppts[0].startsAt) : '—'} />
                {age !== null && <StatCard label="Edad" value={`${age} años`} />}
            </div>

            {/* Info */}
            {[client.rut, client.dateOfBirth, client.gender, client.occupation, client.phone, client.email, client.whatsapp, client.referredBy].some(Boolean) && (
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {[
                        { label: 'Teléfono', value: client.phone },
                        { label: 'Email', value: client.email },
                        { label: 'WhatsApp', value: client.whatsapp },
                        { label: 'RUT', value: client.rut },
                        { label: 'Fecha de nacimiento', value: client.dateOfBirth ? new Date(client.dateOfBirth + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                        { label: 'Género', value: client.gender },
                        { label: 'Ocupación', value: client.occupation },
                        { label: 'Derivado por', value: client.referredBy },
                    ].filter((f) => f.value).map((f) => (
                        <div key={f.label} className="flex flex-col gap-0.5">
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{f.label}</p>
                            <p className="text-sm" style={{ color: 'var(--fg)' }}>{f.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Internal notes */}
            <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Notas internas</h2>
                    <button
                        onClick={() => void handleSaveNotes()}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                        style={{ borderColor: 'var(--border)', color: notesSaved ? 'var(--accent)' : 'var(--fg-secondary)' }}
                    >
                        {saving ? <IconLoader2 size={11} className="animate-spin" /> : notesSaved ? <IconCheck size={11} /> : null}
                        {notesSaved ? 'Guardado' : 'Guardar'}
                    </button>
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    placeholder="Notas clínicas, observaciones, contexto relevante..."
                    className="w-full text-sm resize-none outline-none bg-transparent"
                    style={{ color: 'var(--fg)' }}
                />
            </div>

            {/* Appointments history */}
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>
                Historial de sesiones ({appointments.length})
            </h2>
            {appointments.length === 0 ? (
                <div className="rounded-2xl border py-10 text-center" style={{ borderColor: 'var(--border)' }}>
                    <IconCalendar size={20} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sin sesiones registradas.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {sortedAppts.map((appt) => {
                        const hasNotes = !!(appt.sessionNote ?? appt.internalNotes ?? appt.clientNotes);
                        const expanded = expandedNotes.has(appt.id);
                        return (
                            <div
                                key={appt.id}
                                className="rounded-2xl border overflow-hidden"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="flex items-center gap-4 p-4">
                                    <div
                                        className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                                        style={{ background: STATUS_COLORS[appt.status] ?? 'var(--fg-muted)' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                            {formatDate(appt.startsAt)} — {formatTime(appt.startsAt)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {STATUS_LABELS[appt.status] ?? appt.status}
                                                {appt.price ? ` · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: appt.currency, minimumFractionDigits: 0 }).format(parseFloat(appt.price))}` : ''}
                                            </p>
                                            <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                {appt.modality === 'online'
                                                    ? <><IconVideo size={11} /> Online</>
                                                    : <><IconMapPin size={11} /> Presencial{appt.location ? ` · ${appt.location}` : ''}</>}
                                            </span>
                                        </div>
                                    </div>
                                    {hasNotes && (
                                        <button
                                            onClick={() => toggleApptNotes(appt.id)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle) shrink-0"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            <IconNotes size={12} />
                                            Notas
                                            <IconChevronDown size={11} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                                {expanded && (
                                    <div className="px-4 pb-4 flex flex-col gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                        {appt.sessionNote && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Nota de sesión</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.sessionNote}</p>
                                            </div>
                                        )}
                                        {appt.internalNotes && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Notas internas</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.internalNotes}</p>
                                            </div>
                                        )}
                                        {appt.clientNotes && (
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fg-muted)' }}>Notas del paciente</p>
                                                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg)' }}>{appt.clientNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</p>
        </div>
    );
}
