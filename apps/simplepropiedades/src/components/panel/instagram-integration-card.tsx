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
            panelDescription="Publica propiedades en Instagram desde el panel."
            connectedDescription="Publica tus propiedades desde Compartir."
            listingNoun="propiedades"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            disconnect={disconnectInstagram}
        />
    );
}
