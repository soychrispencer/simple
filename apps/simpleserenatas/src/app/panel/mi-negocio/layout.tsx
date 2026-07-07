'use client';

import { SubscriptionGate } from '@/components/auth/subscription-gate';
import { SerenataProvider } from '@/context/serenata-context';
import { SerenatasPanelChrome } from '@/components/panel/serenatas-panel-chrome';
import { PanelConfirmProvider } from '@simple/ui/panel';

export default function MiNegocioLayout({ children }: { children: React.ReactNode }) {
    return (
        <SubscriptionGate>
            <SerenataProvider>
                <PanelConfirmProvider>
                    <SerenatasPanelChrome section="mi-negocio" shellOwned>
                        {children}
                    </SerenatasPanelChrome>
                </PanelConfirmProvider>
            </SerenataProvider>
        </SubscriptionGate>
    );
}
