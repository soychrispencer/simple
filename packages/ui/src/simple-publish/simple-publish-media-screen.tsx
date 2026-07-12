'use client';

import type { ReactNode } from 'react';
import { SimplePublishRequiredMark } from './simple-publish-field';
import { SimplePublishPhotoGrid, type SimplePublishPhoto } from './simple-publish-photo-grid';
import { SimplePublishSurface } from './simple-publish-surface';

export type SimplePublishMediaScreenProps = {
    photos: SimplePublishPhoto[];
    maxPhotos?: number;
    recommendedPhotos?: number;
    photoError?: string;
    photoInvalid?: boolean;
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
    onAddFiles,
    onRemovePhoto,
    onReorderPhotos,
    videoBlock,
}: SimplePublishMediaScreenProps) {
    return (
        <div className="space-y-4">
            <SimplePublishSurface>
                <label className="mb-3 block text-sm font-medium text-(--fg)">
                    Fotos
                    <SimplePublishRequiredMark />
                </label>
                <SimplePublishPhotoGrid
                    photos={photos}
                    maxPhotos={maxPhotos}
                    recommendedPhotos={recommendedPhotos}
                    error={photoError}
                    invalid={photoInvalid}
                    onAddFiles={onAddFiles}
                    onRemovePhoto={onRemovePhoto}
                    onReorderPhotos={onReorderPhotos}
                />
            </SimplePublishSurface>
            {videoBlock}
        </div>
    );
}
