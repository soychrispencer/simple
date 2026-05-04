'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerfilConfiguracionPerfilPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/musician/edit');
    }, [router]);

    return null;
}
