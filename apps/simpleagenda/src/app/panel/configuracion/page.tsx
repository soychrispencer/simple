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
    IconCoin,
} from '@tabler/icons-react';
import { fetchAgendaProfile, fetchAgendaStats, type AgendaProfile, type AgendaStats } from '@/lib/agenda-api';

type Section = {
    href: string;
    icon: React.ElementType;
    title: string;
    description: string;
    done: boolean;
    required: boolean;
};

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
    const locationsDone = stats?.hasLocations === true;
    const publicadoDone = profile?.isPublished === true;

    const sections: Section[] = [
        {
            href: '/panel/configuracion/perfil',
            icon: IconUser,
            title: 'Perfil profesional',
            description: 'Foto, nombre, profesión, bio y políticas.',
            done: perfilDone,
            required: true,
        },
        {
            href: '/panel/configuracion/servicios',
            icon: IconBriefcase,
            title: 'Servicios y sesiones',
            description: 'Tipos de consulta, duración y precio.',
            done: serviciosDone,
            required: true,
        },
        {
            href: '/panel/configuracion/disponibilidad',
            icon: IconClock,
            title: 'Disponibilidad',
            description: 'Horarios semanales y bloqueos de tiempo.',
            done: disponibilidadDone,
            required: true,
        },
        {
            href: '/panel/configuracion/cobros',
            icon: IconCreditCard,
            title: 'Métodos de cobro',
            description: 'MercadoPago, link de pago o transferencia.',
            done: cobrosDone,
            required: false,
        },
        {
            href: '/panel/configuracion/direcciones',
            icon: IconMapPin,
            title: 'Direcciones',
            description: 'Consultorios y lugares donde atiendes presencialmente.',
            done: locationsDone,
            required: false,
        },
        {
            href: '/panel/configuracion/link',
            icon: IconLink,
            title: 'Publicar tu agenda',
            description: 'Activa tu link público y compártelo con tus pacientes.',
            done: publicadoDone,
            required: true,
        },
    ];

    const extras = [
        {
            href: '/panel/configuracion/integraciones',
            icon: IconPlug,
            title: 'Integraciones',
            description: 'Google Calendar, WhatsApp y otras conexiones.',
        },
        {
            href: '/panel/suscripciones',
            icon: IconCoin,
            title: 'Suscripción',
            description: 'Gestiona tu plan y método de pago mensual.',
        },
    ];

    const requiredSections = sections.filter((s) => s.required);
    const completedRequired = requiredSections.filter((s) => s.done).length;
    const allReady = completedRequired === requiredSections.length;

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>Configuración</h1>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {allReady
                        ? 'Tu agenda está activa y lista para recibir reservas.'
                        : 'Ajusta cada sección a tu ritmo — todas están disponibles desde el inicio.'}
                </p>
            </div>

            {/* Progress bar — solo si no está todo completo */}
            {!loading && !allReady && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                            {completedRequired} de {requiredSections.length} secciones esenciales
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {Math.round((completedRequired / requiredSections.length) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(completedRequired / requiredSections.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Secciones */}
            <div className="flex flex-col gap-2 mb-10">
                {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-[72px] rounded-2xl animate-pulse" style={{ background: 'var(--border)' }} />
                    ))
                    : sections.map((section) => {
                        const pendingRequired = section.required && !section.done;
                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:border-[--accent-border]"
                                style={{
                                    borderColor: pendingRequired ? 'var(--accent-border)' : 'var(--border)',
                                    background: pendingRequired ? 'var(--accent-soft)' : 'var(--surface)',
                                }}
                            >
                                {/* Icono de estado */}
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                        background: section.done ? 'var(--accent)' : 'var(--bg-muted)',
                                        color: section.done ? '#fff' : 'var(--fg-muted)',
                                    }}
                                >
                                    {section.done
                                        ? <IconCheck size={16} />
                                        : <section.icon size={16} />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                            {section.title}
                                        </p>
                                        {!section.done && !section.required && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                Opcional
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                        {section.description}
                                    </p>
                                </div>

                                <IconChevronRight size={16} style={{ color: pendingRequired ? 'var(--accent)' : 'var(--fg-muted)' }} />
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
