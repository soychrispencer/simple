'use client';

import dynamic from 'next/dynamic';
import { IconMapPin, IconNavigation, IconRoute } from '@tabler/icons-react';
import { PanelButton, PanelCard } from '@simple/ui';
import type { Serenata } from '@/lib/serenatas-api';
import { EmptyBlock, FieldInput, googleMapsDirectionsUrl, googleMapsUrl, money } from './shared';

const SerenataMap = dynamic(() => import('@/components/serenata-map'), {
    ssr: false,
    loading: () => <div className="h-full min-h-[520px] rounded-3xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} />,
});

export function MapView({ date, setDate, items, refresh }: { date: string; setDate: (date: string) => void; items: Serenata[]; refresh: () => Promise<void> }) {
    const sortedItems = [...items].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
    const total = sortedItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const locatedItems = sortedItems.filter((item) => item.lat && item.lng);
    const routeUrl = googleMapsDirectionsUrl(sortedItems);

    return (
        <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
            <div className="min-w-0">
                <PanelCard>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Ruta del día</h2>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{sortedItems.length} serenatas · {money(total)}</p>
                        </div>
                        {sortedItems.length > 0 ? (
                            <PanelButton onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}>
                                <IconNavigation size={17} />
                                Abrir ruta
                            </PanelButton>
                        ) : null}
                    </div>
                    <div className="mt-4">
                        <FieldInput type="date" value={date} onChange={(event) => setDate(event.target.value)} onBlur={() => void refresh()} />
                    </div>
                </PanelCard>

                <div className="mt-4 grid gap-3">
                    {sortedItems.length === 0 ? null : sortedItems.map((item, index) => (
                        <PanelCard key={item.id} className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.recipientName}</p>
                                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{item.eventTime} · {item.comuna ?? 'Sin comuna'}</p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold" style={{ color: 'var(--accent)' }}>{money(item.price)}</p>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{item.address}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <a className="inline-flex items-center gap-1.5 text-xs font-semibold" href={googleMapsUrl(item)} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                                            <IconMapPin size={14} />
                                            Abrir punto
                                        </a>
                                        {!item.lat || !item.lng ? <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Sin coordenadas exactas</span> : null}
                                    </div>
                                </div>
                            </div>
                        </PanelCard>
                    ))}
                </div>
            </div>

            <PanelCard className="min-h-[620px] overflow-hidden p-0">
                {sortedItems.length === 0 ? (
                    <div className="flex h-full min-h-[620px] flex-col items-center justify-center px-6 text-center">
                        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                            <IconMapPin size={38} />
                        </div>
                        <EmptyBlock title="No tienes serenatas para hoy" description="Cuando confirmes una serenata y asignes grupo, aparecerá en la ruta de su fecha." />
                    </div>
                ) : (
                    <div className="relative h-full min-h-[620px]">
                        <SerenataMap items={sortedItems} />
                        <div className="absolute left-4 top-4 rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                <IconRoute size={17} />
                                {locatedItems.length} de {sortedItems.length} puntos en mapa
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>Ruta sugerida por cercanía y horario</p>
                        </div>
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
