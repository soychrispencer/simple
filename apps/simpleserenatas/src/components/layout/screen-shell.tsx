'use client';

import type { ReactNode } from 'react';

/** Shell ligero alineado con tokens de PanelShell (@simple/ui). */
export function ScreenShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-(--bg) font-sans text-(--fg)">
            <main className="mx-auto min-w-0 w-full max-w-full flex-1">{children}</main>
        </div>
    );
}
