'use client';

import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { useSerenataOptional } from '@/context/serenata-context';

export function Header() {
    const ctx = useSerenataOptional();

    return (
        <SerenatasChromeHeader
            mode={ctx?.mode}
            profiles={ctx?.profiles ?? undefined}
        />
    );
}
