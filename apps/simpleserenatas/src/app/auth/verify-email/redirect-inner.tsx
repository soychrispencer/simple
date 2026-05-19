'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyEmailRedirectInner({ target }: { target: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const query = searchParams.toString();
        router.replace(query ? `${target}?${query}` : target);
    }, [router, searchParams, target]);

    return (
        <p className="auth-text-muted p-8 text-center text-sm">
            Redirigiendo…
        </p>
    );
}
