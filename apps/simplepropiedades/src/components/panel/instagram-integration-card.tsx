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
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            disconnect={disconnectInstagram}
        />
    );
}
