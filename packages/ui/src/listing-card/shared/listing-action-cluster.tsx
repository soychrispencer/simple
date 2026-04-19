'use client';

import { useEffect, useRef, useState } from 'react';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconBrandFacebook,
    IconBrandWhatsapp,
    IconBrandX,
    IconCopy,
    IconDots,
    IconExternalLink,
    IconFlag,
    IconMail,
    IconMessage,
    IconUser,
} from '@tabler/icons-react';
import { PanelButton, PanelIconButton } from '../../index';

type Props = {
    ctaLabel: string;
    listingTitle: string;
    listingHref: string;
    onCta: (e: React.MouseEvent) => void;
    onShare?: (e: React.MouseEvent) => void;
    onReport?: (e: React.MouseEvent) => void;
    onViewProfile?: (e: React.MouseEvent) => void;
    onContact?: (e: React.MouseEvent) => void;
    onToggleSave?: (e: React.MouseEvent) => void;
    isSaved?: boolean;
    stretchCta?: boolean;
};

export default function ListingActionCluster({
    ctaLabel,
    listingTitle,
    listingHref,
    onCta,
    onShare,
    onReport,
    onViewProfile,
    onContact,
    onToggleSave,
    isSaved = false,
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

    const absoluteUrl = () => {
        if (typeof window === 'undefined') return listingHref;
        return listingHref.startsWith('http') ? listingHref : `${window.location.origin}${listingHref}`;
    };

    const openInNewTab = (url: string) => {
        if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        try {
            await navigator.clipboard.writeText(absoluteUrl());
            onShare?.(e);
        } catch {
            /* no-op */
        }
    };

    const handleWhatsapp = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        const text = encodeURIComponent(`${listingTitle} — ${absoluteUrl()}`);
        openInNewTab(`https://wa.me/?text=${text}`);
    };

    const handleEmail = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        const subject = encodeURIComponent(listingTitle);
        const body = encodeURIComponent(absoluteUrl());
        openInNewTab(`mailto:?subject=${subject}&body=${body}`);
    };

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        openInNewTab(absoluteUrl());
    };

    const handleProfile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onViewProfile?.(e);
    };

    const handleReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onReport?.(e);
    };

    const handleFacebook = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        const url = encodeURIComponent(absoluteUrl());
        openInNewTab(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
    };

    const handleTwitter = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        const text = encodeURIComponent(listingTitle);
        const url = encodeURIComponent(absoluteUrl());
        openInNewTab(`https://x.com/intent/tweet?text=${text}&url=${url}`);
    };

    const handleContact = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onContact?.(e);
    };

    const handleToggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuOpen(false);
        onToggleSave?.(e);
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
                    className="absolute right-0 bottom-full z-40 mb-1 w-52 overflow-hidden rounded-xl border py-1 shadow-lg"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem icon={<IconExternalLink size={14} />} label="Abrir en nueva pestaña" onClick={handleOpen} />
                    {onToggleSave ? (
                        <MenuItem
                            icon={isSaved ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} />}
                            label={isSaved ? 'Quitar de guardados' : 'Guardar publicación'}
                            onClick={handleToggleSave}
                        />
                    ) : null}
                    {onContact ? (
                        <MenuItem icon={<IconMessage size={14} />} label="Contactar al vendedor" onClick={handleContact} />
                    ) : null}
                    {onViewProfile ? (
                        <MenuItem icon={<IconUser size={14} />} label="Ver perfil del vendedor" onClick={handleProfile} />
                    ) : null}
                    <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
                    <MenuItem icon={<IconCopy size={14} />} label="Copiar enlace" onClick={handleCopyLink} />
                    <MenuItem icon={<IconBrandWhatsapp size={14} />} label="Compartir por WhatsApp" onClick={handleWhatsapp} />
                    <MenuItem icon={<IconBrandFacebook size={14} />} label="Compartir en Facebook" onClick={handleFacebook} />
                    <MenuItem icon={<IconBrandX size={14} />} label="Compartir en X" onClick={handleTwitter} />
                    <MenuItem icon={<IconMail size={14} />} label="Enviar por email" onClick={handleEmail} />
                    {onReport ? (
                        <>
                            <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
                            <MenuItem
                                icon={<IconFlag size={14} />}
                                label="Reportar publicación"
                                onClick={handleReport}
                                tone="danger"
                            />
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
    tone = 'neutral',
}: {
    icon: React.ReactNode;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    tone?: 'neutral' | 'danger';
}) {
    const color = tone === 'danger' ? 'var(--color-error)' : 'var(--fg)';
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)]"
            style={{ color }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
