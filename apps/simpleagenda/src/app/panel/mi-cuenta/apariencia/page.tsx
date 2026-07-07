'use client';

import {
    PanelAccountShell,
    ACCOUNT_APPEARANCE_PAGE,
} from '@simple/ui/panel';
import { AccountThemePreferenceSection } from '@simple/ui/theme';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function AparienciaCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="apariencia"
            tabs={accountSectionTabs}
            title={ACCOUNT_APPEARANCE_PAGE.title}
            description={ACCOUNT_APPEARANCE_PAGE.description}
        >
            <AccountThemePreferenceSection />
        </PanelAccountShell>
    );
}
