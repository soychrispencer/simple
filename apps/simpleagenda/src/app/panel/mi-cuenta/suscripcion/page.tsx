'use client';

import SubscriptionWrapper from './subscription-wrapper';
import { PanelAccountShell, ACCOUNT_SUBSCRIPTION_PAGE, accountSubscriptionDescription } from '@simple/ui/panel';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function SuscripcionesPage() {
    return (
        <PanelAccountShell
            activeKey="suscripcion"
            tabs={accountSectionTabs}
            title={ACCOUNT_SUBSCRIPTION_PAGE.title}
            description={accountSubscriptionDescription('Simple Agenda')}
        >
            <SubscriptionWrapper />
        </PanelAccountShell>
    );
}
