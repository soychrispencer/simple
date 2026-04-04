'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconCalendar,
    IconMail,
    IconPhone,
    IconLoader2,
    IconEdit,
    IconCheck,
    IconUser,
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
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);

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
            <div className="rounded-2xl border p-5 mb-6 flex items-center gap-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{fullName}</h1>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                        {client.email && (
                            <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--fg-muted)' }}>
                                <IconMail size={12} />{client.email}
                            </a>
                        )}
                        {client.phone && (
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--fg-muted)' }}>
                                <IconPhone size={12} />{client.phone}
                            </a>
                        )}
                        {client.city && (
                            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{client.city}</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setEditing(!editing)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                >
                    <IconEdit size={15} />
                </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <StatCard label="Sesiones" value={String(completedAppts.length)} />
                <StatCard label="Total cobrado" value={totalPaid > 0 ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalPaid) : '$0'} />
                <StatCard label="Primera cita" value={appointments.length > 0 ? formatDate(appointments[appointments.length - 1].startsAt) : '—'} />
            </div>

            {/* Info */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {[
                    { label: 'RUT', value: client.rut },
                    { label: 'Fecha de nacimiento', value: client.dateOfBirth },
                    { label: 'Género', value: client.gender },
                    { label: 'Ocupación', value: client.occupation },
                    { label: 'WhatsApp', value: client.whatsapp },
                    { label: 'Derivado por', value: client.referredBy },
                ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="flex flex-col gap-0.5">
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{f.label}</p>
                        <p className="text-sm" style={{ color: 'var(--fg)' }}>{f.value}</p>
                    </div>
                ))}
            </div>

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
                    {appointments.map((appt) => (
                        <div
                            key={appt.id}
                            className="flex items-center gap-4 p-4 rounded-2xl border"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div
                                className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                                style={{ background: STATUS_COLORS[appt.status] ?? 'var(--fg-muted)' }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    {formatDate(appt.startsAt)} — {formatTime(appt.startsAt)}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    {STATUS_LABELS[appt.status] ?? appt.status}
                                    {appt.price ? ` · ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: appt.currency, minimumFractionDigits: 0 }).format(parseFloat(appt.price))}` : ''}
                                </p>
                            </div>
                        </div>
                    ))}
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
