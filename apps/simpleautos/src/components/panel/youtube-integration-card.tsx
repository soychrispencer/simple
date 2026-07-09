'use client';

import {
    YouTubeIntegrationCard as SharedYouTubeIntegrationCard,
} from '@simple/ui/integrations';
import {
    buildYouTubeConnectUrl,
    disconnectYouTube,
    fetchYouTubeIntegrationStatus,
} from '@/lib/youtube';

export default function YouTubeIntegrationCard() {
    return (
        <SharedYouTubeIntegrationCard
            buildConnectUrl={buildYouTubeConnectUrl}
            fetchStatus={fetchYouTubeIntegrationStatus}
            disconnect={disconnectYouTube}
        />
    );
}
