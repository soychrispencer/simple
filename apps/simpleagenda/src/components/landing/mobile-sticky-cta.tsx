'use client';

import { useEffect, useState } from 'react';
import { IconArrowRight, IconCalendarPlus, IconX } from '@tabler/icons-react';

interface MobileStickyCTAProps {
    onStartFree: () => void;
}

export function MobileStickyCTA({ onStartFree }: MobileStickyCTAProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (dismissed) return;
            // Mostrar una vez que el usuario scrollea más allá del Hero (~420px)
            if (window.scrollY > 420) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [dismissed]);

    if (!visible || dismissed) return null;

    return (
        <aside
            aria-label="Acceso rápido para crear agenda"
            className="fixed bottom-0 inset-x-0 z-50 p-3 sm:hidden animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
        >
            <div
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border shadow-xl backdrop-blur-md"
                style={{
                    backgroundColor: 'rgba(var(--surface-rgb, 255, 255, 255), 0.96)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                }}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                            background: 'var(--accent-subtle)',
                            color: 'var(--accent)',
                        }}
                    >
                        <IconCalendarPlus size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-[var(--fg)]">
                            Tu agenda online 24/7
                        </p>
                        <p className="text-[11px] text-[var(--fg-muted)] truncate">
                            0% comisión · Prueba 30d Pro
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={onStartFree}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                        }}
                    >
                        Comenzar
                        <IconArrowRight size={14} />
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        aria-label="Cerrar barra flotante"
                        className="p-1 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                    >
                        <IconX size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
