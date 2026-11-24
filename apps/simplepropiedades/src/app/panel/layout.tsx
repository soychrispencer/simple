'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { PanelShell } from '@/components/panel/panel-shell';
import { PanelConfirmProvider, PostRegistrationRoleWizardGate } from '@simple/ui/panel';
import { simpleFontClassName } from '@simple/ui/fonts';
import { usePathname } from 'next/navigation';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const isPublishFlow = pathname.startsWith('/panel/publicar');
    const isInvitationRoute = pathname === '/panel/equipo';

    return (
        <div className={simpleFontClassName}>
            <AuthGuard allowInvitationPreview={isInvitationRoute}>
                <PanelConfirmProvider>
                    {isPublishFlow ? (
                        <PostRegistrationRoleWizardGate vertical="propiedades" enabled>
                            {children}
                        </PostRegistrationRoleWizardGate>
                    ) : (
                        <PostRegistrationRoleWizardGate vertical="propiedades" enabled={!isInvitationRoute}>
                            <div className="flex min-h-screen min-w-0 flex-col bg-(--bg) text-(--fg)">
                                <div className="shrink-0">
                                    <Header />
                                </div>
                                <PanelShell>
                                    {children}
                                </PanelShell>
                            </div>
                        </PostRegistrationRoleWizardGate>
                    )}
                </PanelConfirmProvider>
            </AuthGuard>
        </div>
    );
}
