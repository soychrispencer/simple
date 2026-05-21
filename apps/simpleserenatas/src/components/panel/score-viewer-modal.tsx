'use client';

import { PanelSheet } from './panel-sheet';

export function ScoreViewerModal({
    title,
    storageUrl,
    onClose,
}: {
    title: string;
    storageUrl: string;
    onClose: () => void;
}) {
    const src = storageUrl.includes('/api/media/proxy')
        ? storageUrl
        : `/api/media/proxy?src=${encodeURIComponent(storageUrl)}`;

    return (
        <PanelSheet ariaLabel={title} onClose={onClose} maxWidthClass="sm:max-w-4xl" constrainHeight>
            <div className="flex min-h-0 flex-1 flex-col p-4">
                <p className="shrink-0 text-sm font-semibold text-fg">{title}</p>
                <div className="mt-3 min-h-0 flex-1">
                    <iframe title={title} src={src} className="h-[min(70dvh,600px)] w-full rounded-xl border border-border bg-bg-subtle" />
                </div>
            </div>
        </PanelSheet>
    );
}
