'use client';

import SubscriptionManager from '@/components/panel/subscription-manager';
import {
    PanelAccountShell,
    DEFAULT_ACCOUNT_SECTION_TABS,
    ACCOUNT_SUBSCRIPTION_PAGE,
    accountSubscriptionDescription,
} from '@simple/ui/panel';

export default function SuscripcionesPage() {
    return (
        <PanelAccountShell
            activeKey="suscripcion"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_SUBSCRIPTION_PAGE.title}
            description={accountSubscriptionDescription('Simple Autos')}
        >
            <SubscriptionManager />
        </PanelAccountShell>
    );
}
