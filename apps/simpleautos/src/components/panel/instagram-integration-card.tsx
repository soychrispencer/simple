'use client';

import Image from 'next/image';
import { InstagramIntegrationCard } from '@simple/ui/integrations';
import {
    buildInstagramConnectUrl,
    disconnectInstagram,
    fetchInstagramIntegrationStatus,
} from '@/lib/instagram';

export default function AppInstagramIntegrationCard() {
    return (
        <InstagramIntegrationCard
            panelDescription="Conecta tu cuenta profesional y publica avisos desde el panel."
            connectedDescription="Listo. Publica cada aviso activo con el botón Compartir."
            listingNoun="avisos"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
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
        />
    );
}
