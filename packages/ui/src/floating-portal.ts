'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export const FLOATING_POPOVER_GAP_PX = 6;
export const FLOATING_VIEWPORT_PAD_PX = 8;
export const FLOATING_POPOVER_Z_INDEX = 9999;

export type FloatingPosition = {
    top: number;
    left: number;
    width: number;
};

export function useFloatingPortalPosition(
    open: boolean,
    triggerRef: RefObject<HTMLElement | null>,
    popoverRef: RefObject<HTMLElement | null>,
    /** Re-run layout when content size changes (e.g. month change, option count). */
    layoutDeps: unknown[] = [],
) {
    const [position, setPosition] = useState<FloatingPosition | null>(null);

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight ?? 280;
        const width = rect.width;
        const maxLeft = window.innerWidth - width - FLOATING_VIEWPORT_PAD_PX;
        const left = Math.max(FLOATING_VIEWPORT_PAD_PX, Math.min(rect.left, maxLeft));
        const spaceBelow = window.innerHeight - rect.bottom - FLOATING_VIEWPORT_PAD_PX;
        const openAbove = spaceBelow < popoverHeight && rect.top > spaceBelow;
        const top = openAbove
            ? Math.max(FLOATING_VIEWPORT_PAD_PX, rect.top - popoverHeight - FLOATING_POPOVER_GAP_PX)
            : rect.bottom + FLOATING_POPOVER_GAP_PX;
        setPosition({ top, left, width });
    }, [popoverRef, triggerRef]);

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null);
            return;
        }
        updatePosition();
        const raf = requestAnimationFrame(updatePosition);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutDeps are intentional triggers
    }, [open, updatePosition, ...layoutDeps]);

    useEffect(() => {
        if (!open) return;
        const onReposition = () => updatePosition();
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open, updatePosition]);

    return position;
}

export function useFloatingPortalDismiss(
    open: boolean,
    onClose: () => void,
    rootRef: RefObject<HTMLElement | null>,
    popoverRef: RefObject<HTMLElement | null>,
) {
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
            onClose();
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [onClose, open, popoverRef, rootRef]);
}
