'use client';

import { PanelAuthGuard } from '@simple/auth';

export function AuthGuard({ children, allowInvitationPreview = false }: { children: React.ReactNode; allowInvitationPreview?: boolean }) {
    return <PanelAuthGuard appLabel="SimpleAutos" brandAppId="simpleautos" allowAnonymous={allowInvitationPreview}>{children}</PanelAuthGuard>;
}
