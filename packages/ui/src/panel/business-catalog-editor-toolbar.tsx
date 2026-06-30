'use client';

import type { ReactNode } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { PanelButton } from './panel-button.js';

export type BusinessCatalogEditorToolbarProps = {
    summary?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    hideAction?: boolean;
};

/** Fila superior unificada: resumen a la izquierda, acción primaria a la derecha. */
export function BusinessCatalogEditorToolbar({
    summary,
    actionLabel = 'Nuevo servicio',
    onAction,
    hideAction = false,
}: BusinessCatalogEditorToolbarProps) {
    if (!summary && (hideAction || !onAction)) return null;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            {summary ? <div className="text-sm text-fg-muted">{summary}</div> : <span />}
            {!hideAction && onAction ? (
                <PanelButton variant="accent" size="sm" onClick={onAction}>
                    <IconPlus size={14} />
                    {actionLabel}
                </PanelButton>
            ) : null}
        </div>
    );
}
