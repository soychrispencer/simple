'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { IconExternalLink, IconLoader2, IconPlayerPause, IconPlus, IconTrash } from '@tabler/icons-react';
import {
    deleteOperatorProduct,
    deleteOperatorService,
    fetchOperatorProducts,
    fetchOperatorServices,
    formatOperatorProductPrice,
    formatOperatorServicePrice,
    operatorProductToPublication,
    operatorServiceToPublication,
    updateOperatorProduct,
    updateOperatorService,
    type OperatorProductRecord,
    type OperatorServiceRecord,
    type Publication,
    type PublicProfileVertical,
} from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelEmptyState } from './panel-display.js';
import { PanelNotice, PanelStatusBadge } from './panel-primitives.js';
import { getPanelButtonClassName, getPanelButtonStyle } from './panel-button.js';

export type CatalogPublicationKind = 'service' | 'product';

type CatalogRow = {
    publication: Publication;
    raw: OperatorServiceRecord | OperatorProductRecord;
};

export function MarketplaceMyCatalogPublications({
    vertical,
    kind,
}: {
    vertical: PublicProfileVertical;
    kind: CatalogPublicationKind;
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rows, setRows] = useState<CatalogRow[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        if (kind === 'service') {
            const result = await fetchOperatorServices(vertical);
            if (!result.ok) {
                setError(result.error || 'No se pudieron cargar los servicios.');
                setRows([]);
            } else {
                setRows(result.items.map((item) => ({
                    publication: operatorServiceToPublication(item, { verticalId: vertical }),
                    raw: item,
                })));
            }
        } else {
            const result = await fetchOperatorProducts(vertical);
            if (!result.ok) {
                setError(result.error || 'No se pudieron cargar los productos.');
                setRows([]);
            } else {
                setRows(result.items.map((item) => ({
                    publication: operatorProductToPublication(item, { verticalId: vertical }),
                    raw: item,
                })));
            }
        }
        setLoading(false);
    }, [vertical, kind]);

    useEffect(() => {
        void load();
    }, [load]);

    const toggleActive = async (row: CatalogRow) => {
        setBusyId(row.publication.id);
        const nextActive = row.publication.status !== 'active';
        const result = kind === 'service'
            ? await updateOperatorService(vertical, row.publication.id, { isActive: nextActive })
            : await updateOperatorProduct(vertical, row.publication.id, { isActive: nextActive });
        setBusyId(null);
        if (!result.ok) {
            setError(result.error || 'No se pudo actualizar.');
            return;
        }
        await load();
    };

    const remove = async (row: CatalogRow) => {
        if (!window.confirm(`¿Eliminar “${row.publication.title}”?`)) return;
        setBusyId(row.publication.id);
        const result = kind === 'service'
            ? await deleteOperatorService(vertical, row.publication.id)
            : await deleteOperatorProduct(vertical, row.publication.id);
        setBusyId(null);
        if (!result.ok) {
            setError(result.error || 'No se pudo eliminar.');
            return;
        }
        await load();
    };

    const publishHref = kind === 'service' ? '/panel/publicar?op=service' : '/panel/publicar?op=product';
    const manageHref = kind === 'service' ? '/panel/mi-negocio/servicios' : '/panel/mi-negocio/productos';
    const emptyTitle = kind === 'service' ? 'Sin servicios publicados' : 'Sin productos publicados';

    if (loading) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" /> Cargando…
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fg-secondary">
                    {rows.length} {kind === 'service' ? 'servicios' : 'productos'}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={publishHref}
                        className={getPanelButtonClassName({ size: 'sm', className: 'h-9 px-4 text-sm' })}
                        style={getPanelButtonStyle('primary')}
                    >
                        <IconPlus size={13} /> Publicar {kind === 'service' ? 'servicio' : 'producto'}
                    </Link>
                    <Link
                        href={manageHref}
                        className={getPanelButtonClassName({ size: 'sm', className: 'h-9 px-4 text-sm' })}
                        style={getPanelButtonStyle('secondary')}
                    >
                        Edición avanzada
                    </Link>
                </div>
            </div>

            {error ? <PanelNotice tone="warning">{error}</PanelNotice> : null}

            {rows.length === 0 ? (
                <PanelEmptyState
                    title={emptyTitle}
                    description="Créalos desde Publicar. Mi negocio sirve para administrarlos con más detalle."
                />
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((row) => {
                        const priceLabel = kind === 'service'
                            ? formatOperatorServicePrice({
                                pricingMode: (row.raw as OperatorServiceRecord).pricingMode,
                                price: (row.raw as OperatorServiceRecord).price,
                                promoPrice: (row.raw as OperatorServiceRecord).promoPrice,
                                currency: row.raw.currency,
                            })
                            : formatOperatorProductPrice({
                                price: (row.raw as OperatorProductRecord).price,
                                promoPrice: (row.raw as OperatorProductRecord).promoPrice,
                                currency: row.raw.currency,
                            });
                        const busy = busyId === row.publication.id;
                        return (
                            <PanelCard key={row.publication.id} size="md" className="flex flex-col gap-3 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 space-y-1">
                                        <h3 className="truncate text-base font-semibold text-fg">{row.publication.title}</h3>
                                        <p className="text-sm font-medium text-fg">{priceLabel}</p>
                                    </div>
                                    <PanelStatusBadge
                                        label={row.publication.status === 'active' ? 'Activo' : 'Pausado'}
                                        tone={row.publication.status === 'active' ? 'success' : 'warning'}
                                        size="sm"
                                    />
                                </div>
                                {row.publication.description ? (
                                    <p className="line-clamp-2 text-sm text-fg-secondary">{row.publication.description}</p>
                                ) : null}
                                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                                    <Link
                                        href={row.publication.href}
                                        className={getPanelButtonClassName({ size: 'sm', className: 'h-8 px-3 text-xs' })}
                                        style={getPanelButtonStyle('secondary')}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <IconExternalLink size={12} /> Ver
                                    </Link>
                                    <PanelButton
                                        size="sm"
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() => void toggleActive(row)}
                                        className="h-8 px-3 text-xs"
                                    >
                                        <IconPlayerPause size={12} />
                                        {row.publication.status === 'active' ? 'Pausar' : 'Activar'}
                                    </PanelButton>
                                    <PanelButton
                                        size="sm"
                                        variant="danger"
                                        disabled={busy}
                                        onClick={() => void remove(row)}
                                        className="h-8 px-3 text-xs"
                                    >
                                        <IconTrash size={12} /> Eliminar
                                    </PanelButton>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
