'use client';

import { InstagramIntegrationCard } from '@simple/ui/integrations';
import {
    buildInstagramConnectUrl,
    disconnectInstagram,
    fetchInstagramIntegrationStatus,
} from '@/lib/instagram';

export default function AppInstagramIntegrationCard() {
    return (
        <InstagramIntegrationCard
            panelDescription="Publica avisos en Instagram desde el panel."
            connectedDescription="Publica tus avisos desde Compartir."
            listingNoun="avisos"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            disconnect={disconnectInstagram}
        />
    );
}
