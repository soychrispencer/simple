'use client';

import Link from 'next/link';
import { IconRotate } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import type { Serenata } from '@/lib/serenatas-api';
import { publicMariachiPath } from '@/lib/public-mariachi-routes';

export function ClientSerenataRebook({ item }: { item: Serenata }) {
    const slug = item.providerGroupSlug?.trim();
    if (!slug) return null;
    if (item.status === 'payment_pending' || item.status === 'pending' || item.status === 'pending_open') {
        return null;
    }

    return (
        <Link href={publicMariachiPath(slug)} className="mt-3 block">
            <PanelButton type="button" variant="secondary" size="sm" className="w-full">
                <IconRotate size={15} />
                Volver a contratar este mariachi
            </PanelButton>
        </Link>
    );
}
