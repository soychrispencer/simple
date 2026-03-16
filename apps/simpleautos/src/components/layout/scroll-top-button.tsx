'use client';

import { useEffect, useState } from 'react';
import { IconArrowUp } from '@tabler/icons-react';

export function ScrollTopButton() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 260);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollTop}
            aria-label="Ir arriba"
            className={`fixed right-4 md:right-6 bottom-20 md:bottom-6 z-40 h-9 w-9 rounded-[11px] border flex items-center justify-center transition-all ${
                visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                color: 'var(--fg-secondary)',
                boxShadow: 'var(--shadow-sm)',
            }}
        >
            <IconArrowUp size={15} stroke={1.9} />
        </button>
    );
}
