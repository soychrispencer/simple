'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppHeader, AppSidebar, MobileNav } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';
import { isRouteAllowedForRole } from '@/components/layout/panel-nav-config';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, effectiveRole } = useAuth();
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isLoading || !isAuthenticated) return;
        if (!isRouteAllowedForRole(pathname, effectiveRole)) {
            router.replace('/inicio');
        }
    }, [isLoading, isAuthenticated, pathname, effectiveRole, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    if (!isAuthenticated) return null;
    if (!isRouteAllowedForRole(pathname, effectiveRole)) return null;

    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    return (
        <div className="app-layout">
            {/* Header - adapts to sidebar state on desktop */}
            <AppHeader />

            <div className="pt-16 min-h-screen flex">
                <AppSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                />

                {/* Main Content Area */}
                <main className="main-content flex-1 min-w-0">
                    <div className="pb-20 md:pb-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
