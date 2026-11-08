'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider, AuthModal } from '@simple/auth';
import { shouldShowMarketplaceSiteChrome } from '@simple/ui/layout';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isAgendaOperatorSitePath } from '@/lib/operator-site-path';
import { AgendaLaunchModeContext } from '@/components/layout/agenda-launch-mode-context';

export function ClientProviders({ children, agendaLaunchMode }: { children: React.ReactNode; agendaLaunchMode: boolean }) {
    const pathname = usePathname() ?? '';
    const showSiteChrome =
        shouldShowMarketplaceSiteChrome(pathname) && !isAgendaOperatorSitePath(pathname);

    return (
        <AgendaLaunchModeContext.Provider value={agendaLaunchMode}>
            <AuthProvider appId="simpleagenda">
                {showSiteChrome ? (
                    <div className={`flex min-h-screen flex-col${pathname === '/' ? ' agenda-landing' : ''}`}>
                        <a
                            href="#contenido-principal"
                            className="sr-only focus:not-sr-only focus:block focus:border-b focus:border-[var(--border)] focus:bg-[var(--surface)] focus:px-6 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--fg)]"
                        >
                            Saltar al contenido
                        </a>
                        <Header />
                        <main id="contenido-principal" tabIndex={-1} className="flex-1">{children}</main>
                        <Footer />
                    </div>
                ) : (
                    <>{children}</>
                )}
                <AuthModal />
            </AuthProvider>
        </AgendaLaunchModeContext.Provider>
    );
}
