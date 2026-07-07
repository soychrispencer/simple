'use client';

import { IconLoader2 } from '@tabler/icons-react';
import type { DraftMediaUploadProgress } from '@simple/utils';

export type SimplePublishMediaUploadNoticeProps = {
    progress: DraftMediaUploadProgress | null;
};

function buildLabel(progress: DraftMediaUploadProgress): string {
    const shortName = progress.fileName.length > 28
        ? `${progress.fileName.slice(0, 25)}…`
        : progress.fileName;

    if (progress.phase === 'compressing') {
        return `Comprimiendo «${shortName}» en el servidor…`;
    }
    if (progress.fileType === 'video') {
        return `Subiendo video «${shortName}»… ${progress.progress}%`;
    }
    return `Subiendo «${shortName}»… ${progress.progress}%`;
}

export function SimplePublishMediaUploadNotice({ progress }: SimplePublishMediaUploadNoticeProps) {
    if (!progress) return null;

    const indeterminate = progress.phase === 'compressing';

    return (
        <div
            className="rounded-xl border border-(--border) bg-(--bg-subtle)/60 px-4 py-3"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2 text-sm font-medium text-(--fg)">
                <IconLoader2 size={16} className="shrink-0 animate-spin text-(--accent)" aria-hidden />
                <span className="min-w-0 truncate">{buildLabel(progress)}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--border)">
                <div
                    className={`h-full rounded-full bg-(--accent) transition-[width] duration-200 ease-out${indeterminate ? ' w-full animate-pulse' : ''}`}
                    style={indeterminate ? undefined : { width: `${Math.max(4, progress.progress)}%` }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={indeterminate ? undefined : progress.progress}
                />
            </div>
        </div>
    );
}
