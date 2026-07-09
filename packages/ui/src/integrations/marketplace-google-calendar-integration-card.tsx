'use client';

import type { GoogleCalendarMarketplaceVertical } from '@simple/utils';
import {
    buildGoogleCalendarConnectUrl,
    disconnectGoogleCalendarIntegration,
    fetchGoogleCalendarIntegrationStatus,
} from '@simple/utils';
import { GoogleCalendarIntegrationCard } from './google-calendar-integration-card.js';

export type MarketplaceGoogleCalendarIntegrationCardProps = {
    vertical: GoogleCalendarMarketplaceVertical;
};

export function MarketplaceGoogleCalendarIntegrationCard({
    vertical,
}: MarketplaceGoogleCalendarIntegrationCardProps) {
    return (
        <GoogleCalendarIntegrationCard
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
