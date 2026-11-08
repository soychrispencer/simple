'use client';

import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { useAgendaSignup } from './use-agenda-signup';

export function MobileStickyCTA() {
    const { label, start } = useAgendaSignup();
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (dismissed) return;

        const demo = document.getElementById('demo-interactiva');
        const closing = document.getElementById('empezar');
        if (!demo || !closing) return;
        const plans = document.getElementById('planes');

        const updateVisibility = () => {
            const outsidePlans = !plans
                || plans.getBoundingClientRect().bottom <= 0
                || plans.getBoundingClientRect().top >= window.innerHeight;
            const shouldShow = demo.getBoundingClientRect().bottom <= 0
                && closing.getBoundingClientRect().top >= window.innerHeight
                && outsidePlans;
            setVisible((current) => current === shouldShow ? current : shouldShow);
        };
        let frame = 0;
        const scheduleUpdate = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                updateVisibility();
            });
        };
        const observer = new IntersectionObserver(updateVisibility);
        observer.observe(demo);
        observer.observe(closing);
        if (plans) observer.observe(plans);
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', updateVisibility);
        updateVisibility();

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', updateVisibility);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [dismissed]);

    if (!visible || dismissed) return null;

    return (
        <aside
            aria-label="Acceso rápido a SimpleAgenda"
            className="agenda-mobile-cta pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
        >
            <div className="agenda-dark-bar pointer-events-auto mx-auto flex max-w-sm items-center gap-2 p-2 shadow-[var(--agenda-shadow)]">
                <button type="button" onClick={() => start('sticky')} className="agenda-button agenda-button--inverse min-w-0 flex-1">
                    {label}
                </button>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    aria-label="Cerrar barra flotante"
                    className="agenda-dark-bar__icon inline-flex size-11 shrink-0 items-center justify-center"
                >
                    <IconX size={18} aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}
