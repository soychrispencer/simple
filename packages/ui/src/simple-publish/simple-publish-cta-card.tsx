'use client';

import { IconLoader2 } from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';
import type { SimplePublishCtaCardProps } from './types';

export function SimplePublishCtaCard({
    label,
    onClick,
    disabled = false,
    loading = false,
    loadingLabel,
    hint,
    icon,
}: SimplePublishCtaCardProps) {
    return (
        <PanelCard
            size="md"
            className="mt-8 bg-linear-to-b from-(--surface) to-(--bg-subtle)/40"
        >
            {hint ? <p className="mb-3 text-xs leading-relaxed text-(--fg-muted)">{hint}</p> : null}
            <PanelButton
                type="button"
                variant="accent"
                className="h-12 w-full justify-center text-base"
                onClick={onClick}
                disabled={disabled || loading}
            >
                {loading ? (
                    <>
                        <IconLoader2 size={18} className="animate-spin" />
                        {loadingLabel ?? label}
                    </>
                ) : (
                    <>
                        {icon}
                        {label}
                    </>
                )}
            </PanelButton>
        </PanelCard>
    );
}
