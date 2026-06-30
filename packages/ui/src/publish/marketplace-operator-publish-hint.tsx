'use client';

import { PanelNotice } from '../panel/panel-primitives.js';

export type MarketplaceOperatorPublishHintProps = {
    message: string | null;
};

/** Aviso contextual según tipo de operador en Mi negocio (Fase 6). */
export function MarketplaceOperatorPublishHint({ message }: MarketplaceOperatorPublishHintProps) {
    if (!message?.trim()) return null;

    return (
        <PanelNotice tone="info">
            {message}
        </PanelNotice>
    );
}
