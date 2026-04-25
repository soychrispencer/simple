'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { musicianProfile, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Redirect to inicio if already has musician profile
    useEffect(() => {
        if (!isLoading && isAuthenticated && musicianProfile) {
            router.push('/inicio');
        }
    }, [musicianProfile, isLoading, isAuthenticated, router]);

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

    // Don't render if not ready or already has profile
    if (!isAuthenticated || musicianProfile) {
        return null;
    }

    return <>{children}</>;
}
