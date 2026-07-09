'use client';

import { GoogleCalendarIntegrationCard } from '@simple/ui/integrations';
import { serenatasApi } from '@/lib/serenatas-api';

export function SerenatasGoogleCalendarIntegrationCard() {
    return (
        <GoogleCalendarIntegrationCard
            subscriptionsHref="/panel/mi-cuenta?account_tab=subscription"
            fetchStatus={serenatasApi.googleCalendarStatus}
            getAuthUrl={serenatasApi.googleCalendarAuthUrl}
            disconnect={serenatasApi.disconnectGoogleCalendar}
        />
    );
}
