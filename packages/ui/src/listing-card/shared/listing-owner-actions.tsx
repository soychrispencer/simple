'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDots, IconLoader2 } from '@tabler/icons-react';
import { PanelButton, PanelIconButton } from '../../index';
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
};

export default function ListingOwnerActions({ primary, secondary = [], busyActionKey, stretchPrimary = false }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={ref} className={`relative flex items-center gap-1.5 ${stretchPrimary ? 'w-full' : ''}`}>
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
                    {open ? (
                        <div
                            className="absolute right-0 bottom-full z-40 mb-1 w-56 overflow-hidden rounded-xl border py-1 shadow-lg"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {secondary.map((action) => {
                                const isBusy = busyActionKey === action.key;
                                const toneColor =
                                    action.tone === 'danger'
                                        ? 'var(--color-error)'
                                        : action.tone === 'primary'
                                            ? 'var(--accent)'
                                            : 'var(--fg)';
                                return (
                                    <button
                                        key={action.key}
                                        type="button"
                                        disabled={action.disabled || isBusy}
                                        onClick={() => {
                                            setOpen(false);
                                            action.onSelect();
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ color: toneColor }}
                                    >
                                        {isBusy ? <IconLoader2 size={13} className="animate-spin" /> : null}
                                        <span>{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
