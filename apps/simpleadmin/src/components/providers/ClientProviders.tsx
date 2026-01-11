'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@simple/auth';

import { getSupabaseClient } from '@/lib/supabase/clientSupabase';

export function ClientProviders({ children }: { children: ReactNode }) {
  const supabaseClient = useMemo(() => getSupabaseClient(), []);

  return (
    <AuthProvider supabaseClient={supabaseClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="simpleadmin-theme-v2"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
