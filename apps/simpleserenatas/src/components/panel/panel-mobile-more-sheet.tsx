'use client';

import { IconMap, IconBriefcase, IconX } from '@tabler/icons-react';
import { PanelSheet } from '@/components/panel/panel-sheet';
import type { PanelNavItem } from '@/components/panel/panel-nav-config';
import type { Section } from '@/context/serenata-context';

type PanelMobileMoreSheetProps = {
    items: PanelNavItem[];
    activeSection: Section;
    onNavigate: (section: Section) => void;
    onClose: () => void;
};

export function PanelMobileMoreSheet({ items, activeSection, onNavigate, onClose }: PanelMobileMoreSheetProps) {
    if (items.length === 0) return null;

    const iconFor = (id: Section) => {
        if (id === 'map') return IconMap;
        if (id === 'mi-negocio') return IconBriefcase;
        return IconMap;
    };

    return (
        <PanelSheet ariaLabel="Más opciones del panel" onClose={onClose}>
            <SheetHeader onClose={onClose} />
            <ul className="grid gap-2 p-4 pt-0">
                {items.map((item) => {
                    const Icon = iconFor(item.id);
                    const active = activeSection === item.id;
                    return (
                        <li key={item.id}>
                            <button
                                type="button"
                                className={`flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors ${
                                    active ? 'border-accent-border bg-accent-soft' : 'border-border bg-surface'
                                }`}
                                onClick={() => {
                                    onNavigate(item.id);
                                    onClose();
                                }}
                            >
                                <Icon size={22} stroke={active ? 2 : 1.5} className="text-accent shrink-0" />
                                <span className="text-sm font-semibold text-fg">{item.label}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </PanelSheet>
    );
}

function SheetHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-base font-semibold text-fg">Más</p>
            <button
                type="button"
                className="rounded-full p-2 text-fg-muted hover:bg-bg-subtle"
                aria-label="Cerrar"
                onClick={onClose}
            >
                <IconX size={20} />
            </button>
        </div>
    );
}
