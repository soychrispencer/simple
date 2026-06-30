'use client';

import { AuthGuard } from '@/components/auth/auth-guard';

export default function PublicarLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-[var(--bg)] pb-24 lg:pb-0">
                {children}
            </div>
        </AuthGuard>
    );
}
