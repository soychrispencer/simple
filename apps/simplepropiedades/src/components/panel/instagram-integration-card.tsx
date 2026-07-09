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
            panelDescription="Conecta tu cuenta profesional y publica propiedades desde el panel."
            connectedDescription="Listo. Publica cada propiedad activa con el botón Compartir."
            listingNoun="propiedades"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            disconnect={disconnectInstagram}
        />
    );
}
