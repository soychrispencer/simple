'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Ruta legacy `/coordinator/tracking/:id` → canónica `/tracking/:id`
 * (plan maestro SimpleSerenatas — una sola pantalla de seguimiento).
 */
export default function CoordinatorTrackingRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';

    useEffect(() => {
        if (id) router.replace(`/tracking/${id}`);
    }, [id, router]);

    return (
        <div className="flex min-h-[40vh] items-center justify-center p-6" style={{ color: 'var(--fg-muted)' }}>
            Redirigiendo…
        </div>
    );
}
