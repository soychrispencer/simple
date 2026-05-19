'use client';

import type { ReactNode } from 'react';

/** Shell ligero alineado con tokens de PanelShell (@simple/ui). */
export function ScreenShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--fg)] font-sans">
            <main className="flex-1 w-full mx-auto">{children}</main>
        </div>
    );
}
