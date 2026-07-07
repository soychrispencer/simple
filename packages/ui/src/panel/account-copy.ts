export const ACCOUNT_LOCATION_PAGE = {
    title: 'Tu ubicación personal',
    description: 'Residencia y direcciones personales.',
} as const;

export const ACCOUNT_NOTIFICATIONS_PAGE = {
    title: 'Notificaciones',
    description: 'Cómo quieres que Simple te avise sobre tu cuenta y tu actividad en el panel.',
} as const;

export const ACCOUNT_APPEARANCE_PAGE = {
    title: 'Apariencia',
    description: 'Tema claro, oscuro o según tu dispositivo.',
} as const;

export const ACCOUNT_SUBSCRIPTION_PAGE = {
    title: 'Suscripción',
    description: 'Plan Simple e historial de facturación.',
} as const;

export const ACCOUNT_SECURITY_PAGE = {
    title: 'Seguridad',
    description: 'Contraseña, correo y acceso a tu cuenta.',
} as const;

export const ACCOUNT_REFERRALS_PAGE = {
    title: 'Referidos',
    description: 'Seguimiento de recomendaciones de pacientes y link para invitar colegas.',
} as const;

export const ACCOUNT_INTEGRATIONS_PAGE = {
    title: 'Integraciones',
} as const;

/** @deprecated Usa ACCOUNT_INTEGRATIONS_PAGE */
export const ACCOUNT_CONNECTIONS_PAGE = ACCOUNT_INTEGRATIONS_PAGE;

export { accountIntegrationsDescription } from './integrations-scope-copy.js';

/** @deprecated Usa accountIntegrationsDescription */
export { accountIntegrationsDescription as accountConnectionsDescription } from './integrations-scope-copy.js';

/** @deprecated Usa ACCOUNT_LOCATION_PAGE */
export const ACCOUNT_ADDRESSES_PAGE = ACCOUNT_LOCATION_PAGE;

export const ACCOUNT_RESIDENCE_BLOCK = {
    title: 'Residencia',
} as const;

export const ACCOUNT_ADDRESSES_BLOCK = {
    title: 'Direcciones personales',
    description:
        'Casa y envíos personales. Estas direcciones son solo para tu cuenta, no para tu negocio.',
} as const;

export const ACCOUNT_BILLING_ADDRESS_BLOCK = {
    title: 'Dirección tributaria',
    description:
        'Dirección para facturación y datos tributarios. Es independiente de tu zona de operación y de las direcciones visibles en tu perfil público.',
    emptyOption: 'Sin dirección tributaria',
} as const;

export const ACCOUNT_SUBSCRIPTION_BILLING_BLOCK = {
    title: 'Datos de facturación',
    description:
        'Razón social, RUT y dirección tributaria para boletas o facturas de tu suscripción a Simple.',
} as const;

export const ACCOUNT_SUBSCRIPTION_BILLING_BUTTON = 'Datos de facturación' as const;

/** @deprecated Usa ACCOUNT_RESIDENCE_BLOCK.title */
export const ACCOUNT_RESIDENCE_SECTION_TITLE = ACCOUNT_RESIDENCE_BLOCK.title;

export function accountResidenceDescription(appLabel: string): string {
    const label = appLabel.toLowerCase();
    if (label.includes('agenda')) {
        return 'País, región y comuna para la zona horaria del panel y preferencias de tu cuenta. Las citas usan la ubicación de Mi negocio.';
    }
    if (label.includes('serenata')) {
        return 'País, región y comuna para la zona horaria del panel y preferencias de tu cuenta. Las serenatas usan la ubicación de Mi negocio.';
    }
    if (label.includes('autos') || label.includes('propiedades')) {
        return 'País, región y comuna para la zona horaria del panel y preferencias de tu cuenta. Las visitas y agendamientos usan la ubicación de Mi negocio.';
    }
    return 'País, región y comuna para la zona horaria del panel y tus preferencias de cuenta.';
}

export function accountAddressesBlockDescription(appMode?: 'client' | 'work'): string {
    if (appMode === 'client') {
        return 'Calle, número y mapa para contratar serenatas más rápido.';
    }
    return ACCOUNT_ADDRESSES_BLOCK.description;
}

export function accountSubscriptionDescription(appLabel: string): string {
    const label = appLabel.toLowerCase();
    if (label.includes('agenda')) {
        return `Tu plan mensual para ${appLabel}.`;
    }
    if (label.includes('autos') || label.includes('propiedad')) {
        return 'Tu plan define cuántos avisos activos puedes mantener y si puedes publicar tu perfil público. Particular, profesional o empresa se configura en Mi negocio, sin depender del plan.';
    }
    return 'Planes mensuales para impulsar tu cuenta.';
}
