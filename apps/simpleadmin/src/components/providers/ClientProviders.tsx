'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="simpleadmin-theme-v2"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
