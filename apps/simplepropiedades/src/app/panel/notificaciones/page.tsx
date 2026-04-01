'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { fetchPanelNotifications, type PanelNotification } from '@/lib/panel-notifications';
import { PanelEmptyState, PanelList, PanelListRow } from '@simple/ui';

export default function NotificacionesPage() {
    const [items, setItems] = useState<PanelNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const run = async () => {
            const next = await fetchPanelNotifications();
            if (!active) return;
            setItems(next);
            setLoading(false);
        };
        void run();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="container-app panel-page max-w-2xl py-8">
            <PanelSectionHeader title="Notificaciones" description="Actividad real del panel" />
            {loading ? (
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando notificaciones...</p>
            ) : items.length === 0 ? (
                <PanelEmptyState title="Sin notificaciones" description="Cuando exista actividad real del panel aparecerá aquí." />
            ) : (
                <PanelList>
                    {items.map((item, index) => (
                        <PanelListRow key={item.id} divider={index > 0} tone="subtle" className="flex items-start gap-3 px-4 py-3.5">
                            <div className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: 'var(--fg)' }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{item.time}</p>
                            </div>
                            <Link href={item.href} className="text-xs" style={{ color: 'var(--fg-muted)' }}>Abrir</Link>
                        </PanelListRow>
                    ))}
                </PanelList>
            )}
        </div>
    );
}
