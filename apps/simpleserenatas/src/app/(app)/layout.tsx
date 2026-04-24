'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader, AppSidebar, MobileNav } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { musicianProfile, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Redirect to onboarding if no musician profile
    useEffect(() => {
        if (!isLoading && isAuthenticated && !musicianProfile) {
            router.push('/onboarding');
        }
    }, [musicianProfile, isLoading, isAuthenticated, router]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--bg)' }}
            >
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    // Don't render if not ready
    if (!isAuthenticated || !musicianProfile) {
        return null;
    }

    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    return (
        <div className="app-layout">
            {/* Desktop Sidebar */}
            <AppSidebar 
                collapsed={sidebarCollapsed} 
                onToggle={toggleSidebar} 
            />

            {/* Header - adapts to sidebar state on desktop */}
            <AppHeader 
                onMenuClick={toggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
            />

            {/* Main Content Area */}
            <main 
                className={`main-content transition-all duration-300 ${
                    sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
                }`}
            >
                <div className="pb-20 md:pb-6">
                    {children}
                </div>
            </main>

            {/* Mobile Navigation */}
            <MobileNav />
        </div>
    );
}
