'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ListingAnchoredMenuPlacement = 'above' | 'below' | 'auto';

type Props = {
    open: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    children: ReactNode;
    placement?: ListingAnchoredMenuPlacement;
    width?: number;
    className?: string;
    ariaLabel?: string;
};

export default function ListingAnchoredMenu({
    open,
    anchorRef,
    onClose,
    children,
    placement = 'auto',
    width = 224,
    className = 'listing-owner-menu overflow-hidden rounded-xl border py-1 shadow-lg',
    ariaLabel = 'Menú',
}: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; transform?: string } | null>(null);

    useEffect(() => {
        if (!open || !anchorRef.current) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            if (!anchorRef.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight ?? 220;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openBelow = placement === 'below'
                || (placement === 'auto' && spaceBelow >= menuHeight + 8)
                || (placement === 'auto' && spaceBelow >= spaceAbove);

            const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);

            if (openBelow) {
                setPosition({ top: rect.bottom + 8, left });
                return;
            }

            setPosition({ top: rect.top - 8, left, transform: 'translateY(-100%)' });
        };

        updatePosition();
        const raf = window.requestAnimationFrame(updatePosition);
        const raf2 = window.requestAnimationFrame(() => window.requestAnimationFrame(updatePosition));
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.cancelAnimationFrame(raf2);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open, anchorRef, placement, width, children]);

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
            className={`fixed z-[200] ${className}`}
            style={{
                top: position.top,
                left: position.left,
                width,
                transform: position.transform,
            }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
            aria-label={ariaLabel}
        >
            {children}
        </div>,
        document.body,
    );
}
