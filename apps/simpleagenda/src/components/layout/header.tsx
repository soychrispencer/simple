'use client';

import { IconPlus } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { NotificationBell } from '@/components/panel/notification-bell';

const publicLinks = [
    { href: '/#como-funciona', label: 'Funciones' },
    { href: '/#planes', label: 'Planes' },
];

export function Header() {
    return (
        <MarketplaceHeader
            brandAppId="simpleagenda"
            publicLinks={publicLinks}
            getPanelNavItems={getPanelNavItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={async () => []}
            notificationSlot={<NotificationBell />}
            primaryActionLabel="Nueva cita"
            primaryActionHref="/panel/agenda?nueva=1"
            primaryActionIcon={IconPlus}
        />
    );
}
