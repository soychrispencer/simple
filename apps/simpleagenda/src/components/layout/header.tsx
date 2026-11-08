'use client';

import { useCallback } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import { NotificationBell } from '@/components/panel/notification-bell';
import { fetchPanelNotifications } from '@/lib/panel-notifications';
import { useAgendaLaunchMode } from '@/components/layout/agenda-launch-mode-context';

export function Header() {
    const agendaLaunchMode = useAgendaLaunchMode();
    const copy = resolveOperatorLandingCopy('agenda');
    const vocab = useAgendaVocab();
    const getItems = useCallback(
        (role: Parameters<typeof getPanelNavItems>[0]) => getPanelNavItems(role, vocab.Clients),
        [vocab.Clients],
    );
    const publicLinks = [
        { href: '/#como-funciona', label: 'Cómo funciona' },
        ...(!agendaLaunchMode ? [{ href: '/#planes', label: 'Planes' }] : []),
        { href: '/profesionales', label: 'Profesionales' },
    ];

    return (
        <MarketplaceHeader
            brandAppId="simpleagenda"
            publicLinks={publicLinks}
            getPanelNavItems={getItems}
            isPanelNavActive={isPanelNavActive}
            fetchPanelNotifications={fetchPanelNotifications}
            notificationSlot={<NotificationBell />}
            primaryActionLabel="Nueva cita"
            primaryActionHref="/panel/agenda?nueva=1"
            primaryActionIcon={IconPlus}
            guestRegisterLabel={copy.headerCta}
            /* La barra completa no cabe hasta 1024px: el menú aparece en lg. */
            desktopNavigationAt="lg"
        />
    );
}
