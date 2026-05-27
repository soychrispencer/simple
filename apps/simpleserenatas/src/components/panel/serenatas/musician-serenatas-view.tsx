'use client';

import { useEffect, useMemo, useState } from 'react';
import { serenatasApi, type MusicianPayout, type Serenata } from '@/lib/serenatas-api';
import { PanelCard } from '@simple/ui/panel';
import { EmptyBlock, money, SerenataRow } from '../shared';
import { ClientMetric } from './client-serenatas-view';

export function MusicianSerenatasView({ serenatas }: { serenatas: Serenata[] }) {
    const scheduledCount = serenatas.filter((item) => item.status === 'scheduled').length;
    const completedCount = serenatas.filter((item) => item.status === 'completed').length;
    const [payouts, setPayouts] = useState<MusicianPayout[]>([]);

    useEffect(() => {
        let cancelled = false;
        void serenatasApi.musicianPayouts().then((response) => {
            if (cancelled || !response.ok) return;
            setPayouts(response.items);
        });
        return () => { cancelled = true; };
    }, []);

    const payoutPending = useMemo(
        () => payouts.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0),
        [payouts],
    );
    const payoutPaid = useMemo(
        () => payouts.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0),
        [payouts],
    );

    return (
        <PanelCard size="lg">
            <div>
                <h2 className="type-section-title text-fg">Serenatas en tus grupos</h2>
                <p className="mt-1 text-sm text-fg-muted">
                    Eventos asignados a grupos donde participas o fuiste invitado.
                </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-5">
                <ClientMetric label="Asignadas" value={serenatas.length} />
                <ClientMetric label="Confirmadas" value={scheduledCount} />
                <ClientMetric label="Completadas" value={completedCount} />
                <MusicianMoneyMetric label="Por cobrar" value={payoutPending} />
                <MusicianMoneyMetric label="Pagado" value={payoutPaid} />
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

function MusicianMoneyMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs text-fg-muted">{label}</p>
            <p className="mt-1.5 text-base font-semibold text-fg">{money(value)}</p>
        </div>
    );
}
