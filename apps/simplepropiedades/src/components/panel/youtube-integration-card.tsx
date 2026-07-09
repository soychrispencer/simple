'use client';

import Image from 'next/image';
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
            cardClassName="mt-6"
            buildConnectUrl={buildYouTubeConnectUrl}
            fetchStatus={fetchYouTubeIntegrationStatus}
            disconnect={disconnectYouTube}
            renderProfileImage={(account) => (
                account.avatarUrl ? (
                    <Image
                        src={account.avatarUrl}
                        alt={account.channelTitle}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                ) : undefined
            )}
        />
    );
}
