'use client';

import { InstagramIntegrationCard } from '@simple/ui';
import {
    buildInstagramConnectUrl,
    disconnectInstagram,
    fetchInstagramIntegrationStatus,
    updateInstagramSettings,
    type InstagramAccountView,
} from '@/lib/instagram';

function formatDate(value: number | null): string {
    if (!value) return 'Aún sin actividad';
    return new Date(value).toLocaleString('es-CL');
}

function AccountStats({ account }: { account: InstagramAccountView }) {
    return (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="prop-stat-tile bg-(--surface)">
                <p className="text-xs uppercase tracking-[0.12em] text-(--fg-muted)">Última sincronización</p>
                <p className="mt-1 text-sm text-(--fg)">{formatDate(account.lastSyncedAt)}</p>
            </div>
            <div className="prop-stat-tile bg-(--surface)">
                <p className="text-xs uppercase tracking-[0.12em] text-(--fg-muted)">Último post</p>
                <p className="mt-1 text-sm text-(--fg)">{formatDate(account.lastPublishedAt)}</p>
            </div>
            <div className="prop-stat-tile bg-(--surface)">
                <p className="text-xs uppercase tracking-[0.12em] text-(--fg-muted)">Scopes</p>
                <p className="mt-1 text-sm text-(--fg)">
                    {account.scopes.length > 0 ? account.scopes.join(', ') : 'Sin scopes reportados'}
                </p>
            </div>
        </div>
    );
}

export default function AppInstagramIntegrationCard() {
    return (
        <InstagramIntegrationCard
            panelDescription="Conecta una cuenta profesional y publica propiedades directamente desde SimplePropiedades."
            autoPublishDescription="Cuando una propiedad quede activa, SimplePropiedades intentará publicarla automáticamente en Instagram."
            autoPublishAriaLabel="Autopublicar propiedades en Instagram"
            captionPlaceholder={
                '🏠 {{title}}\n💰 {{price}}\n📍 {{location}}\n\n{{description}}\n\n🔗 Ver más: {{url}}\n\n#SimplePropiedades #PropiedadesChile'
            }
            listingNoun="propiedades"
            buildConnectUrl={buildInstagramConnectUrl}
            fetchStatus={fetchInstagramIntegrationStatus}
            updateSettings={updateInstagramSettings}
            disconnect={disconnectInstagram}
            renderConnectedAccountExtra={(account) => <AccountStats account={account as InstagramAccountView} />}
        />
    );
}
