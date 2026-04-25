'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google'
import { AppHeader, AppSidebar, MobileNav } from '@/components/layout';
import { useAuth } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] })

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, captainProfile, musicianProfile, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Determine user type
    const isCaptain = user?.role === 'captain' || !!captainProfile;
    const isMusician = user?.role === 'musician' || !!musicianProfile;
    const isClient = user?.role === 'client' || (!isCaptain && !isMusician);

    // Redirect to onboarding if no profile
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            if (!captainProfile && !musicianProfile && !isClient) {
                router.push('/onboarding');
            }
        }
    }, [captainProfile, musicianProfile, isLoading, isAuthenticated, isClient, router]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
            </div>
        );
    }

    // Don't render if not ready
    if (!isAuthenticated || (!captainProfile && !musicianProfile && !isClient)) {
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
