'use client';

import {
    PanelAccountShell,
    ACCOUNT_APPEARANCE_PAGE,
    DEFAULT_ACCOUNT_SECTION_TABS,
} from '@simple/ui/panel';
import { AccountThemePreferenceSection } from '@simple/ui/theme';

export default function AparienciaCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="apariencia"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_APPEARANCE_PAGE.title}
            description={ACCOUNT_APPEARANCE_PAGE.description}
        >
            <AccountThemePreferenceSection />
        </PanelAccountShell>
    );
}
