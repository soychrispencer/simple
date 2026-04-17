'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDots, IconShare2 } from '@tabler/icons-react';
import { PanelButton, PanelIconButton } from '../../index';

type Props = {
    ctaLabel: string;
    onCta: (e: React.MouseEvent) => void;
    onShare?: (e: React.MouseEvent) => void;
    stretchCta?: boolean;
};

export default function ListingActionCluster({
    ctaLabel,
    onCta,
    onShare,
    stretchCta = false,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen((v) => !v);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onShare?.(e);
    };

    return (
        <div ref={menuRef} className={`relative flex items-center gap-1.5 ${stretchCta ? 'w-full' : ''}`}>
            <PanelButton
                type="button"
                variant="primary"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onCta(e);
                }}
                className={`h-9 rounded-full px-4 text-[12px] font-semibold ${stretchCta ? 'flex-1' : ''}`}
            >
                {ctaLabel}
            </PanelButton>
            {onShare ? (
                <>
                    <PanelIconButton
                        type="button"
                        label="Más acciones"
                        variant="ghost"
                        size="sm"
                        onClick={toggleMenu}
                        className="h-9 w-9 rounded-full"
                    >
                        <IconDots size={16} />
                    </PanelIconButton>
                    {menuOpen ? (
                        <div
                            className="absolute right-0 bottom-full z-40 mb-1 w-44 overflow-hidden rounded-xl border py-1 shadow-lg"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={handleShare}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
                                style={{ color: 'var(--fg)' }}
                            >
                                <IconShare2 size={14} /> Compartir
                            </button>
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
