'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconTrash } from '@tabler/icons-react';
import { PanelButton, PanelEmptyState } from '@simple/ui/panel';
import { PanelIconButton, PanelList, PanelListRow } from '@simple/ui/panel';
import { CLIENT_MARKETPLACE_HREF } from '@/lib/client-marketplace';
import {
    readSavedMariachis,
    removeSavedMariachi,
    subscribeSavedMariachis,
    syncSavedMariachisFromApi,
    type SavedMariachiRecord,
} from '@/lib/saved-mariachis';

const FALLBACK_COVER =
    'https://images.unsplash.com/photo-1764593821767-352919115758?auto=format&fit=crop&w=400&q=82';

export function GuardadosView() {
    const router = useRouter();
    const [items, setItems] = useState<SavedMariachiRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sync = () => setItems(readSavedMariachis());
        sync();
        void syncSavedMariachisFromApi()
            .then(setItems)
            .finally(() => setLoading(false));
        return subscribeSavedMariachis(sync);
    }, []);

    const description = useMemo(() => {
        if (items.length === 1) return '1 mariachi guardado';
        return `${items.length} mariachis guardados`;
    }, [items.length]);

    if (loading) {
        return <p className="text-sm text-fg-muted">Cargando guardados…</p>;
    }

    if (items.length === 0) {
        return (
            <PanelEmptyState
                title="Aún no guardas mariachis"
                description="Toca el corazón en una tarjeta del catálogo para añadirla aquí."
                action={
                    <PanelButton type="button" onClick={() => router.push(CLIENT_MARKETPLACE_HREF)}>
                        Explorar mariachis
                    </PanelButton>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-fg-muted">{description}</p>
            <PanelList>
                {items.map((item, index) => (
                    <PanelListRow
                        key={item.id}
                        divider={index > 0}
                        className="flex items-center gap-4 px-4 py-3"
                    >
                        <Link href={item.href} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                            <img
                                src={item.image || FALLBACK_COVER}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </Link>
                        <div className="min-w-0 flex-1">
                            <Link href={item.href} className="block line-clamp-1 text-sm font-medium text-fg">
                                {item.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-fg-muted">
                                {item.subtitle ?? item.location ?? 'Mariachi guardado'}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-fg">{item.price}</p>
                        </div>
                        <PanelIconButton
                            label="Quitar de guardados"
                            size="md"
                            onClick={() => {
                                void removeSavedMariachi(item.id).then(() => setItems(readSavedMariachis()));
                            }}
                        >
                            <IconTrash size={15} />
                        </PanelIconButton>
                    </PanelListRow>
                ))}
            </PanelList>
        </div>
    );
}
