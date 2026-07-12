'use client';

import type { ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { SimplePublishRequiredMark } from './simple-publish-field';
import { SimplePublishPhotoGrid, type SimplePublishPhoto } from './simple-publish-photo-grid';
import { SimplePublishSurface } from './simple-publish-surface';

export type SimplePublishPhotoProcessProgress = {
    current: number;
    total: number;
};

export type SimplePublishMediaScreenProps = {
    photos: SimplePublishPhoto[];
    maxPhotos?: number;
    recommendedPhotos?: number;
    photoError?: string;
    photoInvalid?: boolean;
    /** Progreso al optimizar fotos en el dispositivo antes de agregarlas. */
    photoProcessProgress?: SimplePublishPhotoProcessProgress | null;
    onAddFiles: (files: FileList) => void;
    onRemovePhoto: (id: string) => void;
    onReorderPhotos: (photos: SimplePublishPhoto[]) => void;
    videoBlock?: ReactNode;
};

export function SimplePublishMediaScreen({
    photos,
    maxPhotos,
    recommendedPhotos,
    photoError,
    photoInvalid,
    photoProcessProgress = null,
    onAddFiles,
    onRemovePhoto,
    onReorderPhotos,
    videoBlock,
}: SimplePublishMediaScreenProps) {
    const processing = Boolean(photoProcessProgress && photoProcessProgress.total > 0);
    const progressPercent = processing
        ? Math.round((photoProcessProgress!.current / photoProcessProgress!.total) * 100)
        : 0;

    return (
        <div className="space-y-4">
            <SimplePublishSurface>
                <label className="mb-3 block text-sm font-medium text-(--fg)">
                    Fotos
                    <SimplePublishRequiredMark />
                </label>
                {processing ? (
                    <div
                        className="mb-3 rounded-xl border border-(--border) bg-(--bg-subtle)/60 px-4 py-3"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-(--fg)">
                            <IconLoader2 size={16} className="shrink-0 animate-spin text-(--accent)" aria-hidden />
                            <span className="min-w-0">
                                Optimizando foto {photoProcessProgress!.current} de {photoProcessProgress!.total}…
                            </span>
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--border)">
                            <div
                                className="h-full rounded-full bg-(--accent) transition-[width] duration-200 ease-out"
                                style={{ width: `${Math.max(6, progressPercent)}%` }}
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progressPercent}
                            />
                        </div>
                    </div>
                ) : null}
                <div data-publish-invalid={photoInvalid ? 'true' : undefined}>
                    <SimplePublishPhotoGrid
                        photos={photos}
                        maxPhotos={maxPhotos}
                        recommendedPhotos={recommendedPhotos}
                        error={photoError}
                        invalid={photoInvalid}
                        disabled={processing}
                        onAddFiles={onAddFiles}
                        onRemovePhoto={onRemovePhoto}
                        onReorderPhotos={onReorderPhotos}
                    />
                </div>
            </SimplePublishSurface>
            {videoBlock}
        </div>
    );
}
