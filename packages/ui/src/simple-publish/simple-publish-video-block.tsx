'use client';

import { IconBrandYoutube, IconLink, IconUpload, IconVideo, IconX } from '@tabler/icons-react';
import {
    PUBLISH_VIDEO_MAX_DURATION_SECONDS,
    PUBLISH_VIDEO_MAX_SIZE_MB,
    PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB,
} from '@simple/utils';
import { SimplePublishSurface } from './simple-publish-surface';

export type SimplePublishVideoBlockProps = {
    /** Vista previa del clip subido (blob o URL pública). */
    uploadPreviewUrl?: string | null;
    uploadFileName?: string | null;
    /** Enlace YouTube/Vimeo — excluyente con el clip subido. */
    externalUrl?: string;
    error?: string;
    invalid?: boolean;
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
    onPickUpload,
    onClearUpload,
    onExternalUrlChange,
}: SimplePublishVideoBlockProps) {
    const hasUpload = Boolean(uploadPreviewUrl);
    const hasExternal = Boolean(externalUrl.trim());
    const uploadLocked = hasExternal;
    const externalLocked = hasUpload;

    return (
        <SimplePublishSurface>
            <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-(--fg)">
                    <IconVideo size={17} className="text-(--accent)" />
                    Video opcional (vertical 9:16)
                </div>
                <p className="mt-1 text-xs leading-relaxed text-(--fg-muted)">
                    Un solo video para la tarjeta tipo red social, el feed Descubre e Instagram/TikTok.
                    Sube un clip o pega un enlace de YouTube/Vimeo. Máx. {PUBLISH_VIDEO_MAX_DURATION_SECONDS} s;
                    videos grandes se comprimen solos al subir (hasta {PUBLISH_VIDEO_MAX_SOURCE_SIZE_MB} MB de origen → {PUBLISH_VIDEO_MAX_SIZE_MB} MB).
                </p>
            </div>

            <div className="mt-4 space-y-4">
                <div className="space-y-2">
                    <p className="text-xs font-medium text-(--fg)">Subir clip</p>
                    {hasUpload ? (
                        <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-(--border) p-3">
                            <video
                                src={uploadPreviewUrl ?? undefined}
                                className="h-24 w-[88px] rounded-xl bg-black object-cover"
                                muted
                                playsInline
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-(--fg)">
                                    {uploadFileName ?? 'Clip seleccionado'}
                                </p>
                                <p className="mt-1 text-xs text-(--fg-muted)">
                                    Formato vertical recomendado · MP4, WEBM o MOV
                                </p>
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
                            onClick={onPickUpload}
                            disabled={uploadLocked || !onPickUpload}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg) text-sm font-medium text-(--fg) transition hover:border-(--accent) disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <IconUpload size={16} />
                            Seleccionar video
                        </button>
                    )}
                    {uploadLocked ? (
                        <p className="text-[11px] text-(--fg-muted)">
                            Quita el enlace externo para subir un clip.
                        </p>
                    ) : null}
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-(--border)" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-(--fg-muted)">o</span>
                    <div className="h-px flex-1 bg-(--border)" />
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium text-(--fg)">Enlace de YouTube o Vimeo</p>
                    <div className="relative">
                        <IconLink
                            size={16}
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--fg-muted)"
                        />
                        <input
                            className={`form-input w-full pl-9${invalid ? ' form-input-error' : ''}`}
                            placeholder="https://www.youtube.com/... o https://vimeo.com/..."
                            value={externalUrl}
                            disabled={externalLocked || !onExternalUrlChange}
                            onChange={(event) => onExternalUrlChange?.(event.target.value)}
                        />
                    </div>
                    {externalLocked ? (
                        <p className="text-[11px] text-(--fg-muted)">
                            Quita el clip subido para usar un enlace externo.
                        </p>
                    ) : null}
                    {hasExternal && !externalLocked ? (
                        <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg-subtle)/50 px-3 py-2 text-xs text-(--fg-muted)">
                            <IconBrandYoutube size={16} className="shrink-0 text-(--fg-muted)" />
                            <span className="truncate">{externalUrl.trim()}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            {error?.trim() ? <p className="mt-3 text-xs text-(--color-error)">{error}</p> : null}
        </SimplePublishSurface>
    );
}
