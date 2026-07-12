'use client';

import { IconLoader2 } from '@tabler/icons-react';

export type SimplePublishPhotoProcessProgress = {
    current: number;
    total: number;
};

export type SimplePublishPhotoProcessNoticeProps = {
    progress: SimplePublishPhotoProcessProgress | null | undefined;
    className?: string;
};

export function SimplePublishPhotoProcessNotice({
    progress,
    className,
}: SimplePublishPhotoProcessNoticeProps) {
    if (!progress || progress.total <= 0) return null;

    const percent = Math.round((progress.current / progress.total) * 100);

    return (
        <div
            className={className ?? 'rounded-xl border border-(--border) bg-(--bg-subtle)/60 px-4 py-3'}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2 text-sm font-medium text-(--fg)">
                <IconLoader2 size={16} className="shrink-0 animate-spin text-(--accent)" aria-hidden />
                <span className="min-w-0">
                    Optimizando foto {progress.current} de {progress.total}…
                </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--border)">
                <div
                    className="h-full rounded-full bg-(--accent) transition-[width] duration-200 ease-out"
                    style={{ width: `${Math.max(6, percent)}%` }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                />
            </div>
        </div>
    );
}
