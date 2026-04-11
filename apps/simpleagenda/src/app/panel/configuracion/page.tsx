'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    IconUser,
    IconBriefcase,
    IconClock,
    IconLink,
    IconPlug,
    IconChevronRight,
    IconCreditCard,
    IconMapPin,
    IconCheck,
    IconLoader2,
    IconLock,
} from '@tabler/icons-react';
import { fetchAgendaProfile, fetchAgendaStats, type AgendaProfile, type AgendaStats } from '@/lib/agenda-api';

type StepStatus = 'done' | 'active' | 'locked';

function stepStatus(done: boolean, prevDone: boolean): StepStatus {
    if (done) return 'done';
    if (prevDone) return 'active';
    return 'locked';
}

export default function ConfiguracionPage() {
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [stats, setStats] = useState<AgendaStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const [p, s] = await Promise.all([fetchAgendaProfile(), fetchAgendaStats()]);
            setProfile(p);
            setStats(s);
            setLoading(false);
        })();
    }, []);

    const perfilDone = !!(profile?.displayName && profile?.profession);
    const serviciosDone = stats?.hasServices === true;
    const disponibilidadDone = stats?.hasRules === true;
    const cobrosDone = !!(profile?.mpAccessToken || profile?.paymentLinkUrl || profile?.bankTransferData);
    const publicadoDone = profile?.isPublished === true;

    const steps = [
        {
            num: 1,
            href: '/panel/configuracion/perfil',
            icon: IconUser,
            title: 'Perfil profesional',
            description: 'Foto, nombre, profesión, bio y políticas.',
            done: perfilDone,
            status: stepStatus(perfilDone, true),
        },
        {
            num: 2,
            href: '/panel/configuracion/servicios',
            icon: IconBriefcase,
            title: 'Servicios y sesiones',
            description: 'Tipos de consulta, duración y precio.',
            done: serviciosDone,
            status: stepStatus(serviciosDone, perfilDone),
        },
        {
            num: 3,
            href: '/panel/configuracion/disponibilidad',
            icon: IconClock,
            title: 'Disponibilidad',
            description: 'Horarios semanales y bloqueos de tiempo.',
            done: disponibilidadDone,
            status: stepStatus(disponibilidadDone, serviciosDone),
        },
        {
            num: 4,
            href: '/panel/configuracion/cobros',
            icon: IconCreditCard,
            title: 'Métodos de cobro',
            description: 'MercadoPago, link de pago o transferencia.',
            done: cobrosDone,
            status: stepStatus(cobrosDone, disponibilidadDone),
        },
        {
            num: 5,
            href: '/panel/configuracion/link',
            icon: IconLink,
            title: 'Publicar tu agenda',
            description: 'Activa tu link público y compártelo con tus pacientes.',
            done: publicadoDone,
            status: stepStatus(publicadoDone, cobrosDone),
        },
    ];

    const extras = [
        {
            href: '/panel/configuracion/direcciones',
            icon: IconMapPin,
            title: 'Direcciones de consulta',
            description: 'Dónde atiendes de forma presencial.',
        },
        {
            href: '/panel/configuracion/integraciones',
            icon: IconPlug,
            title: 'Integraciones',
            description: 'Google Calendar, WhatsApp y otras conexiones.',
        },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    const allDone = completedCount === steps.length;

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Configuración</h1>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {allDone
                        ? 'Tu agenda está activa y lista para recibir reservas.'
                        : 'Completa estos pasos para empezar a recibir reservas.'}
                </p>
            </div>

            {/* Progress bar */}
            {!loading && !allDone && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                            {completedCount} de {steps.length} pasos completados
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {Math.round((completedCount / steps.length) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(completedCount / steps.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Steps */}
            <div className="flex flex-col gap-2 mb-10">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-18 rounded-2xl animate-pulse"
                            style={{ background: 'var(--border)' }}
                        />
                    ))
                    : steps.map((step, idx) => {
                        const isLocked = step.status === 'locked';
                        const isDone = step.status === 'done';
                        const isActive = step.status === 'active';

                        const inner = (
                            <div
                                className="flex items-center gap-4 p-4 rounded-2xl border transition-colors"
                                style={{
                                    borderColor: isActive ? 'var(--accent-border)' : 'var(--border)',
                                    background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                                    opacity: isLocked ? 0.45 : 1,
                                    cursor: isLocked ? 'default' : 'pointer',
                                }}
                            >
                                {/* Step indicator */}
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold transition-colors"
                                    style={{
                                        background: isDone ? 'var(--accent)' : isActive ? 'var(--accent)' : 'var(--bg-muted)',
                                        color: isDone || isActive ? '#fff' : 'var(--fg-muted)',
                                    }}
                                >
                                    {isDone ? <IconCheck size={15} /> : isLocked ? <IconLock size={13} /> : step.num}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p
                                        className="text-sm font-semibold"
                                        style={{ color: isDone ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: isDone ? 'line-through' : 'none' }}
                                    >
                                        {step.title}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                        {step.description}
                                    </p>
                                </div>

                                {!isLocked && (
                                    <IconChevronRight size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--fg-muted)' }} />
                                )}
                            </div>
                        );

                        return isLocked ? (
                            <div key={step.href}>{inner}</div>
                        ) : (
                            <Link key={step.href} href={step.href} className="block">
                                {inner}
                            </Link>
                        );
                    })}
            </div>

            {/* Extras */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>
                    Opciones adicionales
                </p>
                <div className="flex flex-col gap-2">
                    {extras.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                            >
                                <item.icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{item.description}</p>
                            </div>
                            <IconChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
