'use client';

import { useState } from 'react';
import { IconLink, IconPlus, IconVideo, IconX } from '@tabler/icons-react';
import { PUBLISH_VIDEO_MAX_DURATION_SECONDS } from '@simple/utils';
import { MediaSourceSheet } from './media-source-sheet';
import { usePrefersCameraSource } from './media-source-picker';
import { SimplePublishSurface } from './simple-publish-surface';

export type SimplePublishVideoBlockProps = {
    uploadPreviewUrl?: string | null;
    uploadFileName?: string | null;
    externalUrl?: string;
    error?: string;
    invalid?: boolean;
    onPickGallery?: () => void;
    onPickCamera?: () => void;
    /** @deprecated Usa onPickGallery. */
    onPickUpload?: () => void;
    onClearUpload?: () => void;
    onExternalUrlChange?: (value: string) => void;
};

export function SimplePublishVideoBlock({
    uploadPreviewUrl,
    uploadFileName,
    externalUrl = '',
    error,
    invalid = false,
    onPickGallery,
    onPickCamera,
    onPickUpload,
    onClearUpload,
    onExternalUrlChange,
}: SimplePublishVideoBlockProps) {
    const [sourceOpen, setSourceOpen] = useState(false);
    const prefersCamera = usePrefersCameraSource();
    const hasUpload = Boolean(uploadPreviewUrl);
    const hasExternal = Boolean(externalUrl.trim());
    const uploadLocked = hasExternal;
    const externalLocked = hasUpload;
    const pickGallery = onPickGallery ?? onPickUpload;

    const openGallery = () => {
        pickGallery?.();
        setSourceOpen(false);
    };

    const openCamera = () => {
        onPickCamera?.();
        setSourceOpen(false);
    };

    const handleAddVideo = () => {
        if (uploadLocked || (!pickGallery && !onPickCamera)) return;
        // Desktop: sin cámara → abre el selector de archivos directo.
        if (!prefersCamera) {
            pickGallery?.();
            return;
        }
        setSourceOpen(true);
    };

    return (
        <SimplePublishSurface>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-(--fg)">
                        <IconVideo size={17} className="text-(--accent)" />
                        Video
                        <span className="font-normal text-(--fg-muted)">(opcional)</span>
                    </p>
                    <p className="mt-0.5 text-xs text-(--fg-muted)">
                        Vertical · máx. {PUBLISH_VIDEO_MAX_DURATION_SECONDS} s
                    </p>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {hasUpload ? (
                    <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-(--border) p-2.5">
                        <video
                            src={uploadPreviewUrl ?? undefined}
                            className="h-20 w-[72px] rounded-xl bg-black object-cover"
                            muted
                            playsInline
                        />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-(--fg)">
                                {uploadFileName ?? 'Clip listo'}
                            </p>
                            <p className="mt-0.5 text-xs text-(--fg-muted)">Se usará en Descubre y redes</p>
                        </div>
                        {onClearUpload ? (
                            <button
                                type="button"
                                onClick={onClearUpload}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border) text-(--fg-muted)"
                                aria-label="Quitar clip"
                            >
                                <IconX size={16} />
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleAddVideo}
                        disabled={uploadLocked || (!pickGallery && !onPickCamera)}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-(--border) bg-(--bg-subtle)/40 text-sm font-semibold text-(--fg) transition hover:border-(--accent)/50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        <IconPlus size={18} className="text-(--accent)" />
                        {prefersCamera ? 'Agregar video' : 'Subir video'}
                    </button>
                )}

                {uploadLocked ? (
                    <p className="text-[11px] text-(--fg-muted)">Quita el enlace para subir un clip.</p>
                ) : null}

                <div className="relative">
                    <IconLink
                        size={15}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--fg-muted)"
                    />
                    <input
                        className={`form-input w-full pl-9 text-sm${invalid ? ' form-input-error' : ''}`}
                        placeholder="O pega un link de YouTube / Vimeo"
                        value={externalUrl}
                        disabled={externalLocked || !onExternalUrlChange}
                        onChange={(event) => onExternalUrlChange?.(event.target.value)}
                    />
                </div>
                {externalLocked ? (
                    <p className="text-[11px] text-(--fg-muted)">Quita el clip para usar un enlace.</p>
                ) : null}
            </div>

            <MediaSourceSheet
                open={sourceOpen}
                title="Agregar video"
                onClose={() => setSourceOpen(false)}
                onCamera={openCamera}
                onGallery={openGallery}
                desktopLabel="Subir video"
            />

            {error?.trim() ? <p className="mt-3 text-xs text-(--color-error)">{error}</p> : null}
        </SimplePublishSurface>
    );
}
