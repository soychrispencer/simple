'use client';

import type { ReactNode } from 'react';
import { IconLoader2, IconPhoto, IconTrash } from '@tabler/icons-react';
import { resolveAppMediaUrl } from '@simple/utils';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelIconButton } from './panel-display.js';
import { PanelStatusBadge, PanelSwitch, type PanelStatusBadgeProps } from './panel-primitives.js';
import {
    BUSINESS_CATALOG_IMAGE_FRAME_COMPACT_CLASS,
    BUSINESS_CATALOG_IMAGE_MEDIA_CLASS,
} from './business-catalog-image-styles.js';

export type BusinessServiceListRowProps = {
    name: string;
    meta?: ReactNode;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    /** Color del servicio (calendario). Franja en la miniatura. */
    accentColor?: string | null;
    /** Reemplaza la insignia Activo/Pausado por defecto. */
    statusBadge?: Pick<PanelStatusBadgeProps, 'label' | 'tone'>;
    /** Oculta la miniatura (p. ej. promociones sin imagen). */
    hideThumbnail?: boolean;
    isEditing?: boolean;
    toggling?: boolean;
    deleting?: boolean;
    actionsDisabled?: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

function MetaContent({ meta }: { meta: ReactNode }) {
    if (typeof meta === 'string') {
        const parts = meta.split(' · ').map((part) => part.trim()).filter(Boolean);
        if (parts.length <= 1) {
            return <p className="text-sm text-fg-muted">{meta}</p>;
        }
        return (
            <div className="flex flex-wrap gap-1.5">
                {parts.map((part, index) => (
                    <span
                        key={`${part}-${index}`}
                        className="inline-flex items-center rounded-md bg-bg-muted px-2 py-0.5 text-xs text-fg-secondary"
                    >
                        {part}
                    </span>
                ))}
            </div>
        );
    }
    return <div className="text-sm text-fg-muted">{meta}</div>;
}

function ListRowThumbnail({
    imageUrl,
    accentColor,
    name,
}: {
    imageUrl?: string | null;
    accentColor?: string | null;
    name: string;
}) {
    const resolved = resolveAppMediaUrl(imageUrl);
    const stripeColor = accentColor ?? 'var(--accent)';

    return (
        <div
            className={`relative h-[4.75rem] w-[5.75rem] shrink-0 sm:h-[5.25rem] sm:w-[6.5rem] ${BUSINESS_CATALOG_IMAGE_FRAME_COMPACT_CLASS}`}
        >
            {resolved ? (
                <img
                    src={resolved}
                    alt=""
                    className={`absolute inset-0 ${BUSINESS_CATALOG_IMAGE_MEDIA_CLASS}`}
                />
            ) : (
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        background: accentColor
                            ? `color-mix(in oklab, ${accentColor} 14%, var(--bg-muted))`
                            : 'var(--bg-muted)',
                    }}
                >
                    <IconPhoto size={22} className="text-fg-muted/70" stroke={1.5} />
                </div>
            )}
            <div
                className="absolute inset-x-0 bottom-0 h-1"
                style={{ background: stripeColor }}
                aria-hidden
            />
            <span className="sr-only">{name}</span>
        </div>
    );
}

/** Fila de servicio unificada para editores de Mi negocio. */
export function BusinessServiceListRow({
    name,
    meta,
    description,
    imageUrl,
    isActive,
    accentColor,
    statusBadge,
    hideThumbnail = false,
    isEditing = false,
    toggling = false,
    deleting = false,
    actionsDisabled = false,
    onToggle,
    onEdit,
    onDelete,
}: BusinessServiceListRowProps) {
    return (
        <PanelCard
            size="sm"
            className={[
                'overflow-hidden p-0',
                isActive ? '' : 'opacity-65',
                isEditing ? 'ring-2 ring-accent/40' : '',
            ].filter(Boolean).join(' ')}
        >
            <div className="flex min-h-[5.5rem] items-stretch gap-4 p-4">
                {hideThumbnail ? null : (
                    <ListRowThumbnail imageUrl={imageUrl} accentColor={accentColor} name={name} />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-fg">{name}</p>
                            {statusBadge ? (
                                <PanelStatusBadge label={statusBadge.label} tone={statusBadge.tone} size="xs" />
                            ) : (
                                <PanelStatusBadge
                                    label={isActive ? 'Activo' : 'Pausado'}
                                    tone={isActive ? 'success' : 'neutral'}
                                    size="xs"
                                />
                            )}
                        </div>
                        {meta ? <MetaContent meta={meta} /> : null}
                        {description ? (
                            <p className="line-clamp-2 text-sm leading-snug text-fg-secondary">{description}</p>
                        ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                        {toggling ? (
                            <IconLoader2 size={14} className="animate-spin text-fg-muted" />
                        ) : (
                            <PanelSwitch
                                checked={isActive}
                                onChange={onToggle}
                                size="sm"
                                ariaLabel={isActive ? 'Pausar servicio' : 'Activar servicio'}
                                disabled={actionsDisabled}
                            />
                        )}
                        <PanelButton
                            variant={isEditing ? 'accent' : 'secondary'}
                            size="sm"
                            disabled={actionsDisabled || deleting}
                            onClick={onEdit}
                        >
                            {isEditing ? 'Editando…' : 'Editar'}
                        </PanelButton>
                        <PanelIconButton
                            label="Eliminar servicio"
                            onClick={onDelete}
                            disabled={deleting || actionsDisabled}
                            className="border border-border hover:border-red-500/40 hover:bg-red-500/10"
                        >
                            {deleting ? (
                                <IconLoader2 size={13} className="animate-spin" />
                            ) : (
                                <IconTrash size={13} />
                            )}
                        </PanelIconButton>
                    </div>
                </div>
            </div>
        </PanelCard>
    );
}
