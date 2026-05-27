'use client';

import dynamic from 'next/dynamic';
import { IconMapPin, IconNavigation, IconRoute } from '@tabler/icons-react';
import { PanelButton } from '@simple/ui/panel';
import { PanelCard, PanelNotice } from '@simple/ui/panel';
import type { Serenata } from '@/lib/serenatas-api';
import { EmptyBlock, FieldDate, googleMapsDirectionsUrl, googleMapsUrl, money } from './shared';

const SerenataMap = dynamic(() => import('@/components/serenata-map'), {
    ssr: false,
    loading: () => <div className="h-full min-h-[520px] rounded-3xl border border-border bg-surface" />,
});

export function MapView({ date, setDate, items }: { date: string; setDate: (date: string) => void; items: Serenata[] }) {
    const sortedItems = [...items].sort((a, b) => (a.eventTime ?? '').localeCompare(b.eventTime ?? ''));
    const total = sortedItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const locatedItems = sortedItems.filter((item) => item.lat && item.lng);
    const missingCoordsCount = sortedItems.length - locatedItems.length;
    const routeUrl = googleMapsDirectionsUrl(sortedItems);

    return (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
            <div className="min-w-0">
                <PanelCard>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-fg">Ruta del día</h2>
                            <p className="mt-1 text-sm text-fg-muted">{sortedItems.length} serenatas · {money(total)}</p>
                        </div>
                        {sortedItems.length > 0 ? (
                            <PanelButton onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}>
                                <IconNavigation size={17} />
                                Abrir ruta
                            </PanelButton>
                        ) : null}
                    </div>
                    <div className="mt-4">
                        <FieldDate value={date} onChange={setDate} aria-label="Fecha del mapa" />
                    </div>
                </PanelCard>

                {missingCoordsCount > 0 ? (
                    <PanelNotice tone="warning" className="mt-4">
                        {missingCoordsCount} parada{missingCoordsCount === 1 ? '' : 's'} sin coordenadas: no aparecen en el mapa ni en la ruta optimizada de Google. Edita la serenata y confirma la dirección.
                    </PanelNotice>
                ) : null}

                <div className="mt-4 grid gap-3">
                    {sortedItems.length === 0 ? null : sortedItems.map((item, index) => (
                        <PanelCard key={item.id} className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-fg">{item.recipientName}</p>
                                            <p className="mt-1 text-xs text-fg-muted">{item.eventTime} · {item.comuna ?? 'Sin comuna'}</p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold text-accent">{money(item.price)}</p>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs text-fg-muted">{item.address}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <a className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent" href={googleMapsUrl(item)} target="_blank" rel="noreferrer">
                                            <IconMapPin size={14} />
                                            Abrir punto
                                        </a>
                                        {!item.lat || !item.lng ? <span className="text-xs text-fg-muted">Sin coordenadas exactas</span> : null}
                                    </div>
                                </div>
                            </div>
                        </PanelCard>
                    ))}
                </div>
            </div>

            <PanelCard className="min-h-[50dvh] overflow-hidden p-0 sm:min-h-[620px]">
                {sortedItems.length === 0 ? (
                    <div className="flex h-full min-h-[50dvh] flex-col items-center justify-center px-6 text-center sm:min-h-[620px]">
                        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-bg-subtle text-fg">
                            <IconMapPin size={38} />
                        </div>
                        <EmptyBlock title="No tienes serenatas para hoy" description="Cuando confirmes una serenata y asignes grupo, aparecerá en la ruta de su fecha." />
                    </div>
                ) : (
                    <div className="relative h-full min-h-[50dvh] sm:min-h-[620px]">
                        <SerenataMap items={sortedItems} />
                        <div className="absolute left-4 top-4 rounded-card border border-border bg-surface px-4 py-3 shadow-sm">
                            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                                <IconRoute size={17} />
                                {locatedItems.length} de {sortedItems.length} puntos en mapa
                            </p>
                            <p className="mt-1 text-xs text-fg-muted">Orden por horario de la serenata</p>
                        </div>
                    </div>
                )}
            </PanelCard>
        </div>
    );
}
