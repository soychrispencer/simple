'use client';

import Image from 'next/image';
import { InstagramIntegrationCard } from '@simple/ui';
import {
    buildInstagramConnectUrl,
    disconnectInstagram,
    fetchInstagramIntegrationStatus,
    updateInstagramSettings,
} from '@/lib/instagram';
import { InstagramIntelligencePanel } from './instagram-intelligence-panel';

export default function AppInstagramIntegrationCard() {
    return (
        <InstagramIntegrationCard
            panelDescription="Conecta una cuenta profesional y publica avisos directamente desde SimpleAutos."
            autoPublishDescription="Cuando un aviso quede activo, SimpleAutos intentará publicarlo automáticamente en Instagram."
            autoPublishAriaLabel="Autopublicar avisos en Instagram"
            captionPlaceholder={
                '🚗 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimpleAutos #AutosChile'
            }
            listingNoun="avisos"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            updateSettings={updateInstagramSettings}
            disconnect={disconnectInstagram}
            renderProfileImage={(account) =>
                account.profilePictureUrl ? (
                    <Image
                        src={account.profilePictureUrl}
                        alt={account.username}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full border border-(--border) object-cover"
                    />
                ) : null
            }
            settingsFooter={({ setMessage, setError }) => (
                <InstagramIntelligencePanel onMessage={setMessage} onError={setError} />
            )}
        />
    );
}
