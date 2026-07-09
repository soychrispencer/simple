'use client';

import { TikTokIntegrationCard as SharedTikTokIntegrationCard } from '@simple/ui/integrations';
import {
    buildTikTokConnectUrl,
    disconnectTikTok,
    fetchTikTokIntegrationStatus,
} from '@/lib/tiktok';

export default function TikTokIntegrationCard() {
    return (
        <SharedTikTokIntegrationCard
            buildConnectUrl={buildTikTokConnectUrl}
            fetchStatus={fetchTikTokIntegrationStatus}
            disconnect={disconnectTikTok}
        />
    );
}
