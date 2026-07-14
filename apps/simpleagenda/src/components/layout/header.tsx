'use client';

import { useCallback } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { MarketplaceHeader } from '@simple/marketplace-header';
import { resolveOperatorLandingCopy } from '@simple/utils';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import { NotificationBell } from '@/components/panel/notification-bell';
import { fetchPanelNotifications } from '@/lib/panel-notifications';

export function Header() {
    const copy = resolveOperatorLandingCopy('agenda');
    const vocab = useAgendaVocab();
    const getItems = useCallback(
        (role: Parameters<typeof getPanelNavItems>[0]) => getPanelNavItems(role, vocab.Clients),
        [vocab.Clients],
    );
    const publicLinks = [
        { href: '/profesionales', label: 'Profesionales' },
        {
            href: '/para-profesionales',
            label: 'Para profesionales',
            items: [
                {
                    href: '/#funciones',
                    label: 'Funciones',
                    description: 'Agenda, clientes, pagos y recordatorios.',
                },
                {
                    href: '/#como-funciona',
                    label: 'Cómo empezar',
                    description: 'Configura tu perfil en 3 pasos.',
                },
            ],
        },
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
        />
    );
}
