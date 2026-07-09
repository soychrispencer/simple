'use client';

import { useEffect, useState } from 'react';
import { GoogleCalendarIntegrationCard } from '@simple/ui/integrations';
import {
    disconnectGoogleCalendar,
    fetchAgendaProfile,
    fetchGoogleCalendarStatus,
    getGoogleCalendarAuthUrl,
    hasAgendaFullAccess,
} from '@/lib/agenda-api';

export function AgendaGoogleCalendarIntegrationCard() {
    const [planLocked, setPlanLocked] = useState(false);
    const [gcConnected, setGcConnected] = useState(false);

    useEffect(() => {
        void fetchAgendaProfile().then((profile) => {
            setPlanLocked(profile ? !hasAgendaFullAccess(profile) : false);
        });
        void fetchGoogleCalendarStatus().then((status) => {
            setGcConnected(status.connected);
        });
    }, []);

    return (
        <GoogleCalendarIntegrationCard
            locked={planLocked && !gcConnected}
            lockedHint="Requiere plan Pro o periodo de prueba activo."
            fetchStatus={fetchGoogleCalendarStatus}
            getAuthUrl={getGoogleCalendarAuthUrl}
            disconnect={disconnectGoogleCalendar}
        />
    );
}
