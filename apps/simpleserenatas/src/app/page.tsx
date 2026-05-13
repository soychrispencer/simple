import { Suspense } from 'react';
import { SerenatasApp } from '@/components/serenatas-app';

export default function HomePage() {
    return (
        <Suspense fallback={null}>
            <SerenatasApp />
        </Suspense>
    );
}
