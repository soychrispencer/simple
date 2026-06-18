export const ACCOUNT_LOCATION_PAGE = {
    title: 'Ubicación',
    description: 'Residencia y direcciones.',
} as const;

export const ACCOUNT_NOTIFICATIONS_PAGE = {
    title: 'Notificaciones',
    description: 'Cómo quieres que Simple te avise sobre tu cuenta y tu actividad en el panel.',
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
    title: 'Direcciones guardadas',
    description:
        'Calle, número y mapa. Las reutilizas al publicar, coordinar entregas o configurar tu negocio.',
} as const;

/** @deprecated Usa ACCOUNT_RESIDENCE_BLOCK.title */
export const ACCOUNT_RESIDENCE_SECTION_TITLE = ACCOUNT_RESIDENCE_BLOCK.title;

export function accountResidenceDescription(appLabel: string): string {
    const label = appLabel.toLowerCase();
    if (label.includes('agenda')) {
        return 'País, región y comuna para tu zona horaria. En Simple Agenda, también es tu lugar de atención por defecto; puedes indicar otro en Mi negocio.';
    }
    if (label.includes('serenata')) {
        return 'País, región y comuna para tu zona horaria y preferencias de cuenta. La operación del grupo usa la ubicación configurada en el negocio.';
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
    if (appLabel.toLowerCase().includes('agenda')) {
        return `Tu plan mensual para ${appLabel}.`;
    }
    return 'Planes mensuales para impulsar tu cuenta.';
}
