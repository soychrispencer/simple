'use client';

import { useMemo } from 'react';
import {
    createPanelFormatters,
    normalizeTimezone,
    type PanelFormatters,
} from '@simple/utils';
import { useAuth } from './auth-context';

export function useUserTimezone(): string {
    const { user } = useAuth();
    return normalizeTimezone(user?.timezone);
}

/**
 * Formateadores del panel: siempre la zona horaria de Mi cuenta.
 * (Agenda: el profesional ve su hora local; mariachis usan useSerenataPanelFormat.)
 */
export function usePanelFormatters(): PanelFormatters {
    const { user } = useAuth();
    const tz = normalizeTimezone(user?.timezone);
    return useMemo(() => createPanelFormatters(tz), [tz]);
}
