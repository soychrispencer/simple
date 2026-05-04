'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

/**
 * Layout para flujos de onboarding (musician, coordinator). Solo exige autenticación.
 * Cada página decide si tiene sentido mostrarse según el perfil que ya tenga el usuario.
 */
export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${inter.className}`}
                style={{ background: 'var(--bg)' }}
            >
                <div
                    className="animate-spin rounded-full h-10 w-10 border-b-2"
                    style={{ borderColor: 'var(--accent)' }}
                />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return <div className={inter.className}>{children}</div>;
}
