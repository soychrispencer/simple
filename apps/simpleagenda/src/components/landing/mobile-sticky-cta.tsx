'use client';

import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';

interface MobileStickyCTAProps {
    label: string;
    onStartFree: () => void;
}

export function MobileStickyCTA({ label, onStartFree }: MobileStickyCTAProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (dismissed) return;

        const hero = document.getElementById('portada');
        const closing = document.getElementById('empezar');
        if (!hero || !closing) return;

        const updateVisibility = () => {
            setVisible(hero.getBoundingClientRect().bottom <= 0 && closing.getBoundingClientRect().top >= window.innerHeight);
        };
        const observer = new IntersectionObserver(updateVisibility);
        observer.observe(hero);
        observer.observe(closing);
        updateVisibility();

        return () => observer.disconnect();
    }, [dismissed]);

    if (!visible || dismissed) return null;

    return (
        <aside
            aria-label="Acceso rápido a SimpleAgenda"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
        >
            <div className="agenda-panel pointer-events-auto mx-auto flex max-w-sm items-center gap-2 p-2 shadow-[var(--agenda-shadow)]">
                <button type="button" onClick={onStartFree} className="agenda-button min-w-0 flex-1">
                    {label}
                </button>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Cerrar barra flotante"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--agenda-radius-control)] text-[var(--fg-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                    <IconX size={18} aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}
