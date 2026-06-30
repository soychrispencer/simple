'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function NavigationProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams?.toString() ?? '';
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const tickRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = (event.target as HTMLElement | null)?.closest('a');
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            try {
                const next = new URL(href, window.location.href);
                if (next.origin !== window.location.origin) return;
                const currentSearch = window.location.search.replace(/^\?/, '');
                if (next.pathname === window.location.pathname && next.search.replace(/^\?/, '') === currentSearch) {
                    return;
                }
                setVisible(true);
                setProgress(16);
            } catch {
                // ignore malformed href
            }
        };

        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    useEffect(() => {
        setVisible(false);
        setProgress(100);
        const done = window.setTimeout(() => setProgress(0), 220);
        return () => window.clearTimeout(done);
    }, [pathname, search]);

    useEffect(() => {
        if (!visible) {
            if (tickRef.current) window.clearInterval(tickRef.current);
            return undefined;
        }

        setProgress((value) => (value < 22 ? 22 : value));
        tickRef.current = window.setInterval(() => {
            setProgress((value) => (value < 88 ? value + 6 + Math.random() * 8 : value));
        }, 320);

        return () => {
            if (tickRef.current) window.clearInterval(tickRef.current);
        };
    }, [visible]);

    if (progress <= 0 && !visible) return null;

    return (
        <div
            className="simple-nav-progress"
            role="progressbar"
            aria-hidden="true"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            style={{
                width: `${progress}%`,
                opacity: visible || progress < 100 ? 1 : 0,
            }}
        />
    );
}

export function NavigationProvider({ children }: { children: ReactNode }) {
    return (
        <>
            <Suspense fallback={null}>
                <NavigationProgressBar />
            </Suspense>
            {children}
        </>
    );
}
