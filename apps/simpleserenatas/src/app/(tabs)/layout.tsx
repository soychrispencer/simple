'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { musicianProfile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to onboarding if no musician profile and not loading
    if (!isLoading && !musicianProfile) {
      router.push('/onboarding');
    }
  }, [musicianProfile, isLoading, router]);

  // Show loading while checking profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  // Don't render children if no profile (will redirect)
  if (!musicianProfile) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20 pt-14">
      <Header />
      <main className="px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
