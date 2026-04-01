'use client';

import { useEffect, useState } from 'react';
import {
    IconCalendar,
    IconUsers,
    IconCreditCard,
    IconClockHour4,
    IconLoader2,
    IconCheck,
} from '@tabler/icons-react';
import Link from 'next/link';
import { fetchAgendaStats, fetchAgendaProfile, type AgendaStats, type AgendaProfile } from '@/lib/agenda-api';

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function PanelHomePage() {
    const [stats, setStats] = useState<AgendaStats | null>(null);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [s, p] = await Promise.all([fetchAgendaStats(), fetchAgendaProfile()]);
            setStats(s);
            setProfile(p);
            setLoading(false);
        };
        void load();
    }, []);

    const setupSteps = [
        {
            label: 'Completa tu perfil profesional',
            href: '/panel/configuracion/perfil',
            done: !!(profile?.displayName && profile?.profession),
        },
        {
            label: 'Agrega tus servicios o tipos de sesión',
            href: '/panel/configuracion/servicios',
            done: false, // would need service count; keep simple
        },
        {
            label: 'Configura tu disponibilidad semanal',
            href: '/panel/configuracion/disponibilidad',
            done: false,
        },
        {
            label: 'Publica tu agenda y comparte tu link',
            href: '/panel/configuracion/perfil',
            done: profile?.isPublished === true,
        },
    ];

    const nextAppt = stats?.nextAppointment;
    const nextApptLabel = nextAppt
        ? `${formatDate(nextAppt.startsAt)} ${formatTime(nextAppt.startsAt)}`
        : '—';

    const statCards = [
        {
            label: 'Citas hoy',
            value: loading ? null : String(stats?.todayCount ?? 0),
            icon: IconCalendar,
            href: '/panel/agenda',
        },
        {
            label: 'Pacientes activos',
            value: loading ? null : String(stats?.activeClients ?? 0),
            icon: IconUsers,
            href: '/panel/clientes',
        },
        {
            label: 'Cobros pendientes',
            value: loading ? null : (
                stats?.pendingPayments
                    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(stats.pendingPayments)
                    : '$0'
            ),
            icon: IconCreditCard,
            href: '/panel/pagos',
        },
        {
            label: 'Próxima cita',
            value: loading ? null : nextApptLabel,
            icon: IconClockHour4,
            href: '/panel/agenda',
        },
    ];

    const setupDone = !loading && setupSteps.every((s) => s.done);

    return (
        <div className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Bienvenido a SimpleAgenda</h1>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
                Aquí encontrarás un resumen de tu consulta.
            </p>

            {/* Quick stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                    <Link
                        key={stat.label}
                        href={stat.href}
                        className="p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                            <stat.icon size={16} />
                        </div>
                        {stat.value === null ? (
                            <IconLoader2 size={18} className="animate-spin mb-1" style={{ color: 'var(--fg-muted)' }} />
                        ) : (
                            <p className="text-2xl font-bold truncate" style={{ color: 'var(--fg)' }}>{stat.value}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{stat.label}</p>
                    </Link>
                ))}
            </div>

            {/* Setup checklist — hidden if all done */}
            {!setupDone && (
                <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>Configura tu agenda</h2>
                    <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>Completa estos pasos para empezar a recibir reservas.</p>
                    <div className="flex flex-col gap-3">
                        {setupSteps.map((step) => (
                            <Link
                                key={step.label}
                                href={step.href}
                                className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-[--accent-border]"
                                style={{ borderColor: 'var(--border)', opacity: step.done ? 0.6 : 1 }}
                            >
                                <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                    style={{
                                        background: step.done ? 'var(--accent)' : 'transparent',
                                        border: step.done ? 'none' : '2px solid var(--border)',
                                    }}
                                >
                                    {step.done && <IconCheck size={11} color="#fff" />}
                                </span>
                                <span className="text-sm" style={{ color: step.done ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: step.done ? 'line-through' : 'none' }}>
                                    {step.label}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
