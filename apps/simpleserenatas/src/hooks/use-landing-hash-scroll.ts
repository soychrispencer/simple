'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LANDING_HASH_SECTION_IDS } from '@/lib/landing-nav';

function scrollToLandingHash() {
    const id = window.location.hash.replace(/^#/, '');
    if (!id || !LANDING_HASH_SECTION_IDS.has(id)) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Al entrar a `/` con hash (`/#musicos`, etc.), desplaza a la sección correspondiente. */
export function useLandingHashScroll(enabled = true) {
    const pathname = usePathname() ?? '/';

    useEffect(() => {
        if (!enabled || pathname !== '/') return;

        const run = () => {
            requestAnimationFrame(() => {
                scrollToLandingHash();
            });
        };

        run();
        const delayed = window.setTimeout(run, 120);
        window.addEventListener('hashchange', run);
        return () => {
            window.clearTimeout(delayed);
            window.removeEventListener('hashchange', run);
        };
    }, [enabled, pathname]);
}
