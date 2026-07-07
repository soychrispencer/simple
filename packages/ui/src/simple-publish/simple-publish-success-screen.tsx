'use client';

import type { ReactNode } from 'react';
import { IconCircleCheck } from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button';
import { PanelCard } from '../panel/panel-card';

export type SimplePublishSuccessScreenProps = {
    title: string;
    brandName: string;
    headline?: string;
    description?: string;
    onReset: () => void;
    onGoToListings?: () => void;
    listingsLabel?: string;
    shareHub?: ReactNode;
    footerNote?: string;
};

export function SimplePublishSuccessScreen({
    title,
    brandName,
    headline,
    description,
    onReset,
    onGoToListings,
    listingsLabel = 'Ir a publicaciones',
    shareHub,
    footerNote,
}: SimplePublishSuccessScreenProps) {
    const resolvedHeadline = headline ?? title;
    const resolvedDescription = description ?? `Ya está visible en ${brandName}.`;

    return (
        <div className="min-h-screen bg-(--bg)">
            <main className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
                <PanelCard size="lg">
                    <div className="space-y-6">
                        <div className="space-y-3 text-center sm:text-left">
                            <span className="inline-flex items-center gap-2 rounded-full bg-(--accent-subtle) px-3 py-1.5 text-xs font-semibold text-(--accent)">
                                <IconCircleCheck size={15} />
                                Publicado
                            </span>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-(--fg) lg:text-3xl">
                                    {resolvedHeadline}
                                </h1>
                                <p className="mt-2 text-sm text-(--fg-secondary)">{resolvedDescription}</p>
                            </div>
                        </div>

                        {shareHub}

                        <div className="flex flex-col gap-2 border-t border-(--border) pt-4 sm:flex-row">
                            <PanelButton type="button" variant="secondary" onClick={onReset}>
                                Publicar otra
                            </PanelButton>
                            {onGoToListings ? (
                                <PanelButton type="button" variant="secondary" onClick={onGoToListings}>
                                    {listingsLabel}
                                </PanelButton>
                            ) : null}
                        </div>
                        {footerNote ? <p className="text-xs text-(--fg-muted)">{footerNote}</p> : null}
                    </div>
                </PanelCard>
            </main>
        </div>
    );
}
