'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    IconBrandFacebook,
    IconBrandWhatsapp,
    IconCopy,
    IconFlag,
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
    title = 'Compartir',
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
            const menuWidth = 208;
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
            className="marketplace-reel-menu fixed z-[200] w-52 overflow-hidden rounded-xl shadow-2xl"
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
    onCopied?: () => void;
    onReport?: () => void;
}): MarketplaceReelShareMenuItem[] {
    const { shareUrl, shareText, onClose, onCopied, onReport } = options;

    const items: MarketplaceReelShareMenuItem[] = [
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: <IconBrandWhatsapp size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank');
            },
        },
        {
            key: 'facebook',
            label: 'Facebook',
            icon: <IconBrandFacebook size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
            },
        },
        {
            key: 'copy',
            label: 'Copiar link',
            icon: <IconCopy size={16} />,
            onSelect: (event) => {
                event.stopPropagation();
                onClose();
                void navigator.clipboard.writeText(shareUrl).then(() => onCopied?.()).catch(() => undefined);
            },
        },
    ];

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
