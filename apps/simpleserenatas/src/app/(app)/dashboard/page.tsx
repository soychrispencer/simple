'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { IconLoader } from '@tabler/icons-react';

// Dashboard único que redirige según rol
export default function DashboardPage() {
  const router = useRouter();
  const { user, effectiveRole, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirigir según rol al dashboard específico
      if (effectiveRole === 'client') {
        router.replace('/cliente');
      } else if (effectiveRole === 'coordinator') {
        router.replace('/coordinador');
      } else if (effectiveRole === 'musician') {
        router.replace('/musico');
      } else {
        router.replace('/cliente'); // Default
      }
    }
  }, [user, effectiveRole, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <IconLoader className="animate-spin" size={32} />
    </div>
  );
}
