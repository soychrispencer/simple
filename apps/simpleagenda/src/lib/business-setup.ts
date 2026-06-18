import type { BusinessSetupStep, PanelBillingAccess } from '@simple/ui/panel';
import { resolvePanelBillingAccess } from '@simple/ui/panel';
import {
    fetchAgendaAvailability,
    fetchAgendaProfile,
    fetchAgendaServices,
} from '@/lib/agenda-api';

export type AgendaBusinessSetupStatus = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
};

function hasAgendaPaymentsConfigured(profile: {
    acceptsMp: boolean;
    acceptsTransfer: boolean;
    acceptsPaymentLink: boolean;
} | null): boolean {
    if (!profile) return false;
    return profile.acceptsMp || profile.acceptsTransfer || profile.acceptsPaymentLink;
}

export async function fetchAgendaBusinessSetupStatus(): Promise<AgendaBusinessSetupStatus> {
    const [profile, services, availability] = await Promise.all([
        fetchAgendaProfile(),
        fetchAgendaServices().catch(() => []),
        fetchAgendaAvailability().catch(() => ({ rules: [], blockedSlots: [] })),
    ]);

    const billing = resolvePanelBillingAccess({
        planId: profile?.plan ?? 'free',
        planExpiresAt: profile?.planExpiresAt ?? null,
        subscriptionHref: '/panel/mi-cuenta/suscripcion',
    });

    const hasProfile = Boolean(profile?.displayName?.trim() && profile?.profession?.trim());
    const hasServices = services.length > 0;
    const hasAvailability = availability.rules.some(
        (rule) => rule.isActive && Boolean(rule.startTime) && Boolean(rule.endTime),
    );
    const hasPayments = hasAgendaPaymentsConfigured(profile);
    const isPublished = Boolean(profile?.isPublished);

    const steps: BusinessSetupStep[] = [
        {
            id: 'perfil',
            label: 'Perfil público',
            description: 'Nombre, profesión y contacto visible para tus pacientes.',
            href: '/panel/mi-negocio',
            complete: hasProfile,
        },
        {
            id: 'servicios',
            label: 'Servicios y sesiones',
            description: 'Define qué ofreces y a qué precio.',
            href: '/panel/mi-negocio/servicios',
            complete: hasServices,
        },
        {
            id: 'disponibilidad',
            label: 'Disponibilidad',
            description: 'Horarios en los que pueden reservar contigo.',
            href: '/panel/mi-negocio/disponibilidad',
            complete: hasAvailability,
        },
        {
            id: 'cobros',
            label: 'Medios de pago',
            description: 'Indica cómo te pagan tus pacientes.',
            href: '/panel/mi-negocio/cobros',
            complete: hasPayments,
        },
        {
            id: 'publicar',
            label: 'Publicar perfil',
            description: 'Haz visible tu página y el directorio de profesionales.',
            href: '/panel/mi-negocio/configuraciones',
            complete: isPublished,
        },
    ];

    return { steps, billing };
}
