'use client';

import Image from 'next/image';
import {
    TikTokIntegrationCard as SharedTikTokIntegrationCard,
} from '@simple/ui/integrations';
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
            renderProfileImage={(account) => (
                account.avatarUrl ? (
                    <Image
                        src={account.avatarUrl}
                        alt={account.username}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                ) : undefined
            )}
        />
    );
}
