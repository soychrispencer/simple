import { Suspense } from 'react';
import { AuthRouteRedirect } from '@simple/auth';

export default function VerifyEmailRedirectPage() {
    return (
        <Suspense fallback={<p className="p-8 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>Redirigiendo…</p>}>
            <AuthRouteRedirect target="/auth/confirmar-correo" />
        </Suspense>
    );
}
