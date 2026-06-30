'use client';

import type { GoogleCalendarMarketplaceVertical } from '@simple/utils';
import {
    buildGoogleCalendarConnectUrl,
    disconnectGoogleCalendarIntegration,
    fetchGoogleCalendarIntegrationStatus,
} from '@simple/utils';
import { GoogleCalendarIntegrationCard } from './google-calendar-integration-card.js';

const DESCRIPTION_BY_VERTICAL: Record<GoogleCalendarMarketplaceVertical, string> = {
    autos: 'Sincroniza tu agenda y recordatorios de visitas o pruebas de manejo.',
    propiedades: 'Sincroniza tu agenda y visitas a propiedades con tu calendario de Google.',
};

export type MarketplaceGoogleCalendarIntegrationCardProps = {
    vertical: GoogleCalendarMarketplaceVertical;
    description?: string;
};

export function MarketplaceGoogleCalendarIntegrationCard({
    vertical,
    description,
}: MarketplaceGoogleCalendarIntegrationCardProps) {
    return (
        <GoogleCalendarIntegrationCard
            description={description ?? DESCRIPTION_BY_VERTICAL[vertical]}
            fetchStatus={async () => {
                const status = await fetchGoogleCalendarIntegrationStatus(vertical);
                if (!status) return null;
                return {
                    connected: status.connected,
                    calendarId: status.calendarId,
                };
            }}
            getAuthUrl={() => buildGoogleCalendarConnectUrl(vertical, window.location.href)}
            disconnect={() => disconnectGoogleCalendarIntegration(vertical)}
        />
    );
}
