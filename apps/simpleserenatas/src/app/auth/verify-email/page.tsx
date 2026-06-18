import { Suspense } from 'react';
import { AuthRouteRedirect } from '@simple/auth';

/** Ruta legacy en inglés → confirmar-correo (canónica, la que envía la API). */
export default function VerifyEmailRedirectPage() {
    return (
        <Suspense fallback={<p className="auth-text-muted p-8 text-center text-sm">Redirigiendo…</p>}>
            <AuthRouteRedirect target="/auth/confirmar-correo" />
        </Suspense>
    );
}
