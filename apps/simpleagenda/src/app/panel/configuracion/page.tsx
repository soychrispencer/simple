'use client';

import { useEffect, useState } from 'react';
import {
    IconUser,
    IconBriefcase,
    IconClock,
    IconLink,
    IconPlug,
    IconCreditCard,
    IconMapPin,
    IconBell,
    IconShield,
} from '@tabler/icons-react';
import { fetchAgendaProfile, fetchAgendaStats, type AgendaProfile, type AgendaStats } from '@/lib/agenda-api';
import { vocab } from '@/lib/vocabulary';
import { PanelConfigPage, type PanelConfigSectionItem } from '@simple/ui';

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
    const cobrosDone = !!(profile?.acceptsTransfer || profile?.acceptsMp || profile?.acceptsPaymentLink);
    const locationsDone = stats?.hasLocations === true;
    const publicadoDone = profile?.isPublished === true;

    const sections: PanelConfigSectionItem[] = [
        {
            key: 'cuenta',
            href: '/panel/configuracion/cuenta',
            icon: <IconUser size={18} />,
            title: 'Datos personales',
            description: 'Nombre, correo y teléfono de tu cuenta.',
            done: !!(profile?.displayName),
            required: true,
        },
        {
            key: 'seguridad',
            href: '/panel/configuracion/seguridad',
            icon: <IconShield size={18} />,
            title: 'Seguridad',
            description: 'Contraseña, autenticación de dos factores.',
            done: false, // TODO: implementar lógica de completitud
            required: true,
        },
        {
            key: 'perfil',
            href: '/panel/configuracion/perfil',
            icon: <IconBriefcase size={18} />,
            title: 'Perfil profesional',
            description: 'Foto, nombre, profesión, bio y políticas.',
            done: perfilDone,
            required: true,
        },
        {
            key: 'servicios',
            href: '/panel/configuracion/servicios',
            icon: <IconBriefcase size={18} />,
            title: 'Servicios y sesiones',
            description: 'Individuales, grupales, packs y promociones.',
            done: serviciosDone,
            required: true,
        },
        {
            key: 'disponibilidad',
            href: '/panel/configuracion/disponibilidad',
            icon: <IconClock size={18} />,
            title: 'Disponibilidad',
            description: 'Horarios semanales y bloqueos de tiempo.',
            done: disponibilidadDone,
            required: true,
        },
        {
            key: 'cobros',
            href: '/panel/configuracion/cobros',
            icon: <IconCreditCard size={18} />,
            title: 'Métodos de cobro',
            description: 'MercadoPago, link de pago o transferencia.',
            done: cobrosDone,
            required: false,
        },
        {
            key: 'direcciones',
            href: '/panel/configuracion/direcciones',
            icon: <IconMapPin size={18} />,
            title: 'Direcciones',
            description: 'Consultorios y lugares donde atiendes presencialmente.',
            done: locationsDone,
            required: false,
        },
        {
            key: 'link',
            href: '/panel/configuracion/link',
            icon: <IconLink size={18} />,
            title: 'Página de reservas',
            description: `Link público, QR, dominio y visibilidad para tus ${vocab.clients}.`,
            done: publicadoDone,
            required: true,
        },
    ];

    const extras: PanelConfigSectionItem[] = [
        {
            key: 'notificaciones',
            href: '/panel/configuracion/notificaciones',
            icon: <IconBell size={18} />,
            title: 'Notificaciones',
            description: 'Email, WhatsApp y avisos para ti y tus pacientes.',
        },
        {
            key: 'integraciones',
            href: '/panel/configuracion/integraciones',
            icon: <IconPlug size={18} />,
            title: 'Integraciones',
            description: 'Google Calendar, MercadoPago y otras conexiones.',
        },
        {
            key: 'suscripciones',
            href: '/panel/suscripciones',
            icon: <IconCreditCard size={18} />,
            title: 'Suscripción',
            description: 'Gestiona tu plan y método de pago mensual.',
            required: true,
        },
    ];

    const requiredSections = sections.filter((s) => s.required !== false);
    const completedRequired = requiredSections.filter((s) => s.done).length;
    const allReady = completedRequired === requiredSections.length;

    return (
        <PanelConfigPage
            title="Mi Cuenta"
            description={allReady
                ? 'Tu agenda está activa y lista para recibir reservas.'
                : 'Administra tu cuenta, perfil y configuración de tu agenda desde aquí.'}
            sections={sections}
            extras={extras}
            showProgress={true}
            loading={loading}
        />
    );
}
