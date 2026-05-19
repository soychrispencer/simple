import { Suspense } from 'react';
import VerifyEmailRedirectInner from './redirect-inner';

/** Ruta EN legacy → confirmar-correo (ES). */
export default function VerifyEmailRedirectPage() {
    return (
        <Suspense fallback={<p className="p-8 text-center text-sm">Redirigiendo…</p>}>
            <VerifyEmailRedirectInner target="/auth/confirmar-correo" />
        </Suspense>
    );
}
