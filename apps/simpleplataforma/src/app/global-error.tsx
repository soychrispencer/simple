'use client';

import '../app/globals.css';
import { GlobalErrorPage } from '@simple/ui/feedback';

export default function GlobalError(props: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="es">
            <body>
                <GlobalErrorPage {...props} appLabel="simpleplataforma" />
            </body>
        </html>
    );
}
