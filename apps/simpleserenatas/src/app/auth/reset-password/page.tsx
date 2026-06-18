import { Suspense } from 'react';
import { AuthRouteRedirect } from '@simple/auth';

/** Ruta legacy en inglés → restablecer (ES). */
export default function ResetPasswordRedirectPage() {
    return (
        <Suspense fallback={<p className="p-8 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>Redirigiendo…</p>}>
            <AuthRouteRedirect target="/auth/restablecer" />
        </Suspense>
    );
}
