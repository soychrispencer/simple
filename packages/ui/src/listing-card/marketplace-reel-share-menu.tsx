'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    IconBrandWhatsapp,
    IconCopy,
    IconExternalLink,
    IconFlag,
    IconShare,
} from '@tabler/icons-react';

export type MarketplaceReelShareMenuItem = {
    key: string;
    label: string;
    icon: ReactNode;
    onSelect: (event: React.MouseEvent) => void;
    tone?: 'neutral' | 'danger';
};

type Props = {
    open: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    items: MarketplaceReelShareMenuItem[];
    title?: string;
};

export function MarketplaceReelShareMenu({
    open,
    anchorRef,
    onClose,
    items,
    title = 'Opciones',
}: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!open || !anchorRef.current) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            if (!anchorRef.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            const menuWidth = 200;
            const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
            setPosition({ top: rect.top - 8, left });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, anchorRef]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (anchorRef.current?.contains(target)) return;
            onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, onClose, anchorRef]);

    if (!open || !position || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={menuRef}
            className="marketplace-reel-menu fixed z-[200] w-50 overflow-hidden rounded-xl shadow-2xl"
            style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
            aria-label={title}
        >
            <div className="marketplace-reel-menu__header">{title}</div>
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={item.onSelect}
                    className={`marketplace-reel-menu__item${item.tone === 'danger' ? ' marketplace-reel-menu__item--danger' : ''}`}
                >
                    <span className="marketplace-reel-menu__item-icon" aria-hidden>
                        {item.icon}
                    </span>
                    {item.label}
                </button>
            ))}
        </div>,
        document.body,
    );
}

export function buildDefaultReelShareMenuItems(options: {
    shareUrl: string;
    shareText: string;
    onClose: () => void;
    onCopied?: (message?: string) => void;
    onReport?: () => void;
    onOpenListing?: () => void;
}): MarketplaceReelShareMenuItem[] {
    const { shareUrl, shareText, onClose, onCopied, onReport, onOpenListing } = options;
    const shareBody = `${shareText}\n${shareUrl}`;
    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    const items: MarketplaceReelShareMenuItem[] = [];

    if (onOpenListing) {
        items.push({
            key: 'open',
            label: 'Ver publicación',
            icon: <IconExternalLink size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                onOpenListing();
            },
        });
    }

    if (canNativeShare) {
        items.push({
            key: 'native-share',
            label: 'Compartir…',
            icon: <IconShare size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                void navigator.share({
                    title: shareText,
                    text: shareText,
                    url: shareUrl,
                }).catch(() => undefined);
            },
        });
    }

    items.push(
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: <IconBrandWhatsapp size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                window.open(`https://wa.me/?text=${encodeURIComponent(shareBody)}`, '_blank', 'noopener,noreferrer');
            },
        },
        {
            key: 'copy-link',
            label: 'Copiar link',
            icon: <IconCopy size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                void navigator.clipboard.writeText(shareUrl)
                    .then(() => onCopied?.('Link copiado'))
                    .catch(() => undefined);
            },
        },
    );

    if (onReport) {
        items.push({
            key: 'report',
            label: 'Reportar',
            icon: <IconFlag size={16} />,
            tone: 'danger',
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                onReport();
            },
        });
    }

    return items;
}
