'use client';

import { useAuth } from '@/context/AuthContext';
import { useSerenatasPushNotifications } from '@/hooks';

/** Solicita permiso de notificaciones y sincroniza suscripción push tras login (Fase 7.3). */
export function SerenatasPushSetup() {
    const { isAuthenticated } = useAuth();
    useSerenatasPushNotifications(isAuthenticated);
    return null;
}
