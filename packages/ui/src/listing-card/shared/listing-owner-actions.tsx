'use client';

import { useRef, useState } from 'react';
import { IconDots, IconDotsVertical, IconLoader2 } from '@tabler/icons-react';
import { PanelButton, PanelIconButton } from '../../index';
import ListingAnchoredMenu from './listing-anchored-menu';
import type { ListingAnchoredMenuPlacement } from './listing-anchored-menu';
import type { OwnerListingAction } from '../types';

type Props = {
    primary?: {
        label: string;
        onSelect: () => void;
        disabled?: boolean;
    };
    secondary?: OwnerListingAction[];
    busyActionKey?: string | null;
    stretchPrimary?: boolean;
    variant?: 'panel' | 'reel';
    menuPlacement?: ListingAnchoredMenuPlacement;
};

export default function ListingOwnerActions({
    primary,
    secondary = [],
    busyActionKey,
    stretchPrimary = false,
    variant = 'panel',
    menuPlacement = 'auto',
}: Props) {
    const [open, setOpen] = useState(false);
    const menuAnchorRef = useRef<HTMLSpanElement | null>(null);

    return (
        <div className={`relative flex items-center gap-1.5 ${stretchPrimary ? 'w-full' : ''}`}>
            {primary ? (
                <PanelButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={primary.disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        primary.onSelect();
                    }}
                    className={`h-9 rounded-full px-4 text-[12px] font-semibold ${stretchPrimary ? 'flex-1' : ''}`}
                >
                    {primary.label}
                </PanelButton>
            ) : null}
            {secondary.length > 0 ? (
                <>
                    <span ref={menuAnchorRef} className="inline-flex shrink-0">
                        {variant === 'reel' ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen((v) => !v);
                                }}
                                className="marketplace-reel-card__icon-btn"
                                aria-label="Más acciones"
                                aria-expanded={open}
                            >
                                <IconDotsVertical size={18} />
                            </button>
                        ) : (
                            <PanelIconButton
                                type="button"
                                label="Más acciones"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen((v) => !v);
                                }}
                                className="h-9 w-9 rounded-full"
                            >
                                <IconDots size={16} />
                            </PanelIconButton>
                        )}
                    </span>
                    <ListingAnchoredMenu
                        open={open}
                        anchorRef={menuAnchorRef}
                        onClose={() => setOpen(false)}
                        placement={menuPlacement}
                        width={224}
                        ariaLabel="Más acciones"
                    >
                        {secondary.map((action) => {
                            const isBusy = busyActionKey === action.key;
                            const toneClass =
                                action.tone === 'danger'
                                    ? 'listing-owner-menu-item--danger'
                                    : action.tone === 'primary'
                                        ? 'listing-owner-menu-item--primary'
                                        : 'listing-owner-menu-item';
                            return (
                                <button
                                    key={action.key}
                                    type="button"
                                    role="menuitem"
                                    disabled={action.disabled || isBusy}
                                    onClick={() => {
                                        setOpen(false);
                                        action.onSelect();
                                    }}
                                    className={`${toneClass} flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                    {isBusy ? <IconLoader2 size={13} className="animate-spin" /> : action.icon}
                                    <span>{action.label}</span>
                                </button>
                            );
                        })}
                    </ListingAnchoredMenu>
                </>
            ) : null}
        </div>
    );
}
