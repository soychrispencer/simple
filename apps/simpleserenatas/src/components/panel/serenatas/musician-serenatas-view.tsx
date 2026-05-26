'use client';

import type { Serenata } from '@/lib/serenatas-api';
import { PanelCard } from '@simple/ui/panel';
import { EmptyBlock, SerenataRow } from '../shared';
import { ClientMetric } from './client-serenatas-view';

export function MusicianSerenatasView({ serenatas }: { serenatas: Serenata[] }) {
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;
    const completedCount = serenatas.filter((item) => item.status === 'completed').length;

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="type-section-title text-fg">Serenatas en tus grupos</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Eventos asignados a grupos donde participas o fuiste invitado.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ClientMetric label="Asignadas" value={serenatas.length} />
                <ClientMetric label="Confirmadas" value={scheduledCount} />
                <ClientMetric label="Completadas" value={completedCount} />
            </div>

            <div className="mt-5 grid gap-3">
                {serenatas.length === 0
                    ? (
                        <EmptyBlock
                            title="Sin serenatas asignadas"
                            description="Cuando un grupo te incluya en una serenata programada, aparecerá aquí."
                        />
                    )
                    : serenatas.map((item) => <SerenataRow key={item.id} item={item} />)}
            </div>
        </PanelCard>
    );
}
