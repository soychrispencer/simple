import { Suspense } from 'react';
import VerifyEmailRedirectInner from '../verify-email/redirect-inner';

/** Ruta EN legacy → restablecer (ES). */
export default function ResetPasswordRedirectPage() {
    return (
        <Suspense fallback={<p className="p-8 text-center text-sm">Redirigiendo…</p>}>
            <VerifyEmailRedirectInner target="/auth/restablecer" />
        </Suspense>
    );
}
