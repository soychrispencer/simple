import type { BusinessSetupStep, PanelBillingAccess } from '@simple/ui/panel';
import { resolvePanelBillingAccess } from '@simple/ui/panel';
import {
    fetchAgendaAvailability,
    fetchAgendaProfile,
    fetchAgendaServices,
    hasAgendaFullAccess,
} from '@/lib/agenda-api';
import {
    fetchAgendaAccountVisitContext,
    fetchAgendaAccountVisits,
    resolveAgendaOperatorFields,
} from '@simple/utils';
import { buildAgendaVocabFromSubtype } from '@/lib/vocabulary';

export type AgendaBusinessSetupStatus = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
    propertyVisitsEnabled: boolean;
    /** Perfil ya público: se puede mostrar el banner “listo para recibir citas”. */
    isPublished: boolean;
    publicUrl: string | null;
    displayName: string | null;
};

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://simpleagenda.app').replace(/\/$/, '');

/**
 * Camino mínimo para vender valor: perfil → servicio → horario → publicar.
 * Medios de pago quedan fuera del onboarding crítico (se configuran después).
 */
export async function fetchAgendaBusinessSetupStatus(): Promise<AgendaBusinessSetupStatus> {
    const propertyVisitContext = await fetchAgendaAccountVisitContext();
    if (!propertyVisitContext) {
        throw new Error('No pudimos comprobar tu espacio de trabajo. Intenta nuevamente.');
    }
    if (propertyVisitContext.enabled) {
        const propertyVisits = await fetchAgendaAccountVisits();
        if (!propertyVisits) {
            throw new Error('No pudimos cargar las visitas de este espacio. Intenta nuevamente.');
        }
        return {
            steps: [{
                id: 'primera_visita',
                label: 'Coordina tu primera visita',
                description: 'Agenda una visita o reunión desde la cartera de tu espacio inmobiliario.',
                href: '/panel/visitas-equipo?nueva=1',
                complete: Boolean(propertyVisits.visits.some((visit) => visit.status !== 'cancelled')),
            }],
            billing: resolvePanelBillingAccess({
                planId: 'free',
                subscriptionHref: '/panel/mi-cuenta/suscripcion',
            }),
            propertyVisitsEnabled: true,
            isPublished: false,
            publicUrl: null,
            displayName: null,
        };
    }

    const [profile, services, availability] = await Promise.all([
        fetchAgendaProfile(),
        fetchAgendaServices(),
        fetchAgendaAvailability(),
    ]);

    const operator = resolveAgendaOperatorFields({
        accountKind: profile?.accountKind,
        operatorSubtype: profile?.operatorSubtype,
        profession: profile?.profession,
    });
    const vocab = buildAgendaVocabFromSubtype(operator.operatorSubtype);
    const billing = resolvePanelBillingAccess({
        planId: profile?.plan ?? 'free',
        planExpiresAt: profile?.planExpiresAt ?? null,
        subscriptionHref: '/panel/mi-cuenta/suscripcion',
    });
    // Con acceso completo (trial/pro), no mostrar expired en el carril de setup.
    const billingForSetup: PanelBillingAccess =
        profile && hasAgendaFullAccess(profile) && billing.status === 'expired'
            ? { ...billing, status: profile.plan === 'pro' || profile.plan === 'pro_plus' ? 'pro' : 'trial' }
            : billing;

    const hasProfile = Boolean(profile?.displayName?.trim() && profile?.profession?.trim());
    const hasServices = services.some((service) => service.isActive !== false);
    const hasAvailability = Boolean(availability.alwaysOpen) || availability.rules.some(
        (rule) => rule.isActive && Boolean(rule.startTime) && Boolean(rule.endTime),
    );
    const isPublished = Boolean(profile?.isPublished);
    const slug = profile?.slug?.trim() || null;
    const publicUrl = slug ? `${APP_URL}/${slug}` : null;

    const appointmentSteps: BusinessSetupStep[] = [
        {
            id: 'perfil',
            label: 'Perfil público',
            description: `Nombre y profesión visibles para tus ${vocab.clients}.`,
            href: '/panel/mi-negocio#agenda-public-profile',
            complete: hasProfile,
        },
        {
            id: 'servicios',
            label: 'Primer servicio',
            description: 'Qué ofreces y cuánto dura; el precio es opcional.',
            href: '/panel/mis-servicios#agenda-first-service',
            complete: hasServices,
        },
        {
            id: 'horarios',
            label: 'Horario de atención',
            description: 'Cuándo pueden reservar contigo.',
            href: '/panel/mi-negocio/horarios#agenda-availability',
            complete: hasAvailability,
        },
        {
            id: 'publicar',
            label: 'Publicar y compartir',
            description: 'Activa tu link público para recibir citas.',
            href: '/panel/mi-negocio#agenda-publish-control',
            complete: isPublished,
        },
    ];
    return {
        steps: appointmentSteps,
        billing: billingForSetup,
        propertyVisitsEnabled: false,
        isPublished,
        publicUrl,
        displayName: profile?.displayName?.trim() || null,
    };
}
