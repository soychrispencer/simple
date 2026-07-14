'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconPlus } from '@tabler/icons-react';
import { PanelButton } from './panel-button.js';

export type BusinessCatalogEditorToolbarProps = {
    summary?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    /** Si existe, el CTA primario navega aquí (crear desde Publicar). */
    actionHref?: string;
    hideAction?: boolean;
};

/** Fila superior unificada: resumen a la izquierda, acción primaria a la derecha. */
export function BusinessCatalogEditorToolbar({
    summary,
    actionLabel = 'Nuevo servicio',
    onAction,
    actionHref,
    hideAction = false,
}: BusinessCatalogEditorToolbarProps) {
    if (!summary && (hideAction || (!onAction && !actionHref))) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            {summary ? <div className="text-sm text-fg-muted">{summary}</div> : <span />}
            {!hideAction && actionHref ? (
                <Link href={actionHref} className="inline-flex">
                    <PanelButton variant="accent" size="sm" type="button">
                        <IconPlus size={14} />
                        {actionLabel}
                    </PanelButton>
                </Link>
            ) : !hideAction && onAction ? (
                <PanelButton variant="accent" size="sm" onClick={onAction}>
                    <IconPlus size={14} />
                    {actionLabel}
                </PanelButton>
            ) : null}
        </div>
    );
}
