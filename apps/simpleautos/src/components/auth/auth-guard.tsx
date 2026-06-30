'use client';

import { PanelAuthGuard } from '@simple/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    return <PanelAuthGuard appLabel="SimpleAutos">{children}</PanelAuthGuard>;
}
