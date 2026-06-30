'use client';

import type { ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelNotice } from './panel-primitives.js';

export type BusinessCatalogInlineFormCardProps = {
    title: string;
    children: ReactNode;
    saving?: boolean;
    error?: string | null;
    ok?: string | null;
    submitLabel: string;
    onSubmit: () => void;
    onCancel: () => void;
};

export function BusinessCatalogInlineFormCard({
    title,
    children,
    saving = false,
    error = null,
    ok = null,
    submitLabel,
    onSubmit,
    onCancel,
}: BusinessCatalogInlineFormCardProps) {
    return (
        <PanelCard size="md" className="space-y-4">
            <h3 className="text-base font-semibold text-fg">{title}</h3>
            <div className="grid gap-4 md:grid-cols-2">{children}</div>
            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {ok ? <PanelNotice tone="success">{ok}</PanelNotice> : null}
            <div className="flex flex-wrap gap-2">
                <PanelButton variant="accent" disabled={saving} onClick={onSubmit}>
                    {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {submitLabel}
                </PanelButton>
                <PanelButton variant="secondary" disabled={saving} onClick={onCancel}>
                    Cancelar
                </PanelButton>
            </div>
        </PanelCard>
    );
}
