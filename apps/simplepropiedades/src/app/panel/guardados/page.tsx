'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconTrash } from '@tabler/icons-react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { PanelEmptyState, PanelIconButton, PanelList, PanelListRow } from '@simple/ui';
import { readSavedListings, removeSavedListing, subscribeSavedListings, syncSavedListingsFromApi, type SavedListingRecord } from '@/lib/saved-listings';

function initialsFromName(name?: string): string {
    if (!name) return 'S';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function gradientFromTitle(title: string): string {
    const seed = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const palettes = [
        ['#172554', '#1e3a8a'],
        ['#0f172a', '#334155'],
        ['#1e293b', '#334155'],
    ];
    const pair = palettes[seed % palettes.length];
    return `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
}

export default function GuardadosPage() {
    const [items, setItems] = useState<SavedListingRecord[]>([]);

    useEffect(() => {
        const sync = () => setItems(readSavedListings());
        sync();
        void syncSavedListingsFromApi().then(setItems);
        return subscribeSavedListings(sync);
    }, []);

    const description = useMemo(
        () => (items.length === 1 ? '1 propiedad guardada' : `${items.length} propiedades guardadas`),
        [items.length]
    );

    return (
        <div className="container-app panel-page py-8 max-w-4xl">
            <PanelSectionHeader title="Guardados" description={description} />

            {items.length === 0 ? (
                <PanelEmptyState description="Todavía no guardas publicaciones." />
            ) : (
                <PanelList>
                    {items.map((item, index) => (
                        <PanelListRow
                            key={item.id}
                            divider={index > 0}
                            className="flex items-center gap-4 px-4 py-3"
                        >
                            <Link href={item.href} className="w-24 h-16 rounded-lg shrink-0" style={{ background: gradientFromTitle(item.title) }} />
                            <div className="flex-1 min-w-0">
                                <Link href={item.href} className="block text-sm font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>{item.title}</Link>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{item.subtitle ?? item.location ?? 'Publicación guardada'}</p>
                                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--fg)' }}>{item.price}</p>
                            </div>
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                                    {initialsFromName(item.sellerName)}
                                </div>
                                <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>{item.sellerName ?? 'Publicador'}</span>
                            </div>
                            <PanelIconButton label="Eliminar guardado" size="md" onClick={() => { void removeSavedListing(item.id).then(() => setItems(readSavedListings())); }}>
                                <IconTrash size={15} />
                            </PanelIconButton>
                        </PanelListRow>
                    ))}
                </PanelList>
            )}
        </div>
    );
}
