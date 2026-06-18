'use client';

import { useRef, useState, type ReactNode } from 'react';
import { IconExternalLink, IconLoader2, IconMapPin, IconPlus } from '@tabler/icons-react';
import { AvatarUpload, type AvatarUploadHandle } from '../avatar-upload.js';

const DEFAULT_BRAND_HINT = (
    <>
        <strong style={{ color: 'var(--fg)' }}>Logo del negocio</strong> (distinto de tu foto personal en Mi cuenta).
        {' '}Portada 16:9 (1600×900 px recomendado) y logo cuadrado 512×512 px.
    </>
);

function initialsFromName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
}

export type PanelProfileBrandImagesProps = {
    displayName: string;
    /** Logo o imagen de marca del negocio en la ficha pública. */
    logoUrl: string | null;
    coverUrl: string | null;
    onLogoChange: (url: string) => void;
    onCoverChange: (url: string) => void;
    onUploadLogo: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
    onUploadCover: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
    onError?: (message: string) => void;
    /** Subtítulo bajo el nombre (titular, profesión, ubicación). */
    subtitle?: string | null;
    /** Si el subtítulo es ubicación, muestra ícono de pin. */
    subtitleVariant?: 'text' | 'location';
    /** Etiqueta en botones (p. ej. logo, isotipo). */
    logoLabel?: string;
    hint?: ReactNode;
    previewHref?: string | null;
    className?: string;
    disabled?: boolean;
};

export function PanelProfileBrandImages({
    displayName,
    logoUrl,
    coverUrl,
    onLogoChange,
    onCoverChange,
    onUploadLogo,
    onUploadCover,
    onError,
    subtitle,
    subtitleVariant = 'text',
    logoLabel = 'logo',
    hint,
    previewHref,
    className,
    disabled = false,
}: PanelProfileBrandImagesProps) {
    const logoUploadRef = useRef<AvatarUploadHandle>(null);
    const coverUploadRef = useRef<AvatarUploadHandle>(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoLoadError, setLogoLoadError] = useState(false);

    const imageUploading = coverUploading || logoUploading || disabled;
    const hasLogo = Boolean(logoUrl && !logoLoadError);
    const logoActionLabel = hasLogo ? `Cambiar ${logoLabel}` : `Agregar ${logoLabel}`;
    const coverActionLabel = coverUrl ? 'Cambiar portada' : 'Agregar portada';
    const resolvedName = displayName.trim() || 'Tu perfil público';
    const resolvedSubtitle = subtitle?.trim() || null;

    return (
        <div className={className ? `grid gap-3 ${className}` : 'grid gap-3'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    Vista previa de tu ficha pública
                </p>
                {previewHref ? (
                    <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: 'var(--accent)' }}
                    >
                        Abrir ficha completa
                        <IconExternalLink size={13} aria-hidden />
                    </a>
                ) : null}
            </div>

            <div
                className="mx-auto w-full max-w-lg overflow-hidden rounded-[1.1rem] border shadow-sm ring-1 ring-black/[0.03] dark:ring-white/10"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="relative aspect-video max-h-[220px] w-full overflow-hidden bg-[var(--bg-subtle)] sm:max-h-[240px]">
                    {coverUrl ? (
                        <img
                            src={coverUrl}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div
                            className="flex h-full w-full items-center justify-center text-sm font-semibold"
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-subtle) 55%, var(--bg-subtle) 100%)',
                                color: 'var(--accent)',
                            }}
                        >
                            Portada pendiente
                        </div>
                    )}

                    <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/28 to-black/5"
                        aria-hidden
                    />

                    <button
                        type="button"
                        onClick={() => coverUploadRef.current?.openPicker()}
                        disabled={imageUploading}
                        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-60"
                        aria-label={coverActionLabel}
                    >
                        {coverUploading ? (
                            <IconLoader2 size={14} className="animate-spin" aria-hidden />
                        ) : (
                            <IconPlus size={14} stroke={2.5} aria-hidden />
                        )}
                        {coverActionLabel}
                    </button>

                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-3.5 sm:p-4">
                        <div className="relative shrink-0">
                            <div className="flex size-14 items-center justify-center overflow-hidden rounded-[14px] border-2 border-white/90 bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)] shadow-md sm:size-16 sm:text-xl">
                                {hasLogo ? (
                                    <img
                                        src={logoUrl!}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={() => setLogoLoadError(true)}
                                    />
                                ) : (
                                    <span>{initialsFromName(resolvedName)}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => logoUploadRef.current?.openPicker()}
                                disabled={imageUploading}
                                className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white/90 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 sm:size-7"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast, #fff)',
                                }}
                                aria-label={logoActionLabel}
                            >
                                {logoUploading ? (
                                    <IconLoader2 size={12} className="animate-spin" aria-hidden />
                                ) : (
                                    <IconPlus size={14} stroke={2.5} aria-hidden />
                                )}
                            </button>
                        </div>

                        <div className="min-w-0 flex-1 pb-0.5">
                            <h3
                                className="truncate text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl"
                                title={resolvedName}
                            >
                                {resolvedName}
                            </h3>
                            {resolvedSubtitle ? (
                                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-medium text-white/85 sm:text-sm">
                                    {subtitleVariant === 'location' ? (
                                        <IconMapPin size={14} className="shrink-0 opacity-90" aria-hidden />
                                    ) : null}
                                    <span className="truncate" title={resolvedSubtitle}>
                                        {resolvedSubtitle}
                                    </span>
                                </p>
                            ) : (
                                <p className="mt-1 text-xs font-medium text-white/70">
                                    Así se verá en el directorio público
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
            >
                {hint ?? DEFAULT_BRAND_HINT}
            </div>

            <AvatarUpload
                ref={logoUploadRef}
                hideTrigger
                currentUrl={logoUrl}
                config={{
                    maxSize: 5120,
                    maxWidth: 512,
                    maxHeight: 512,
                    aspectRatio: 1,
                    circular: false,
                    shape: 'card',
                    onUpload: async (file, croppedBlob) => {
                        setLogoUploading(true);
                        try {
                            const uploadFile = new File([croppedBlob], file.name || 'logo.webp', { type: 'image/webp' });
                            return await onUploadLogo(uploadFile, croppedBlob);
                        } finally {
                            setLogoUploading(false);
                        }
                    },
                }}
                onSuccess={(url) => {
                    setLogoLoadError(false);
                    onLogoChange(url);
                }}
                onError={(message) => onError?.(message)}
            />

            <AvatarUpload
                ref={coverUploadRef}
                hideTrigger
                currentUrl={coverUrl}
                config={{
                    maxSize: 8192,
                    maxWidth: 1600,
                    maxHeight: 900,
                    aspectRatio: 16 / 9,
                    circular: false,
                    shape: 'card',
                    onUpload: async (file, croppedBlob) => {
                        setCoverUploading(true);
                        try {
                            const uploadFile = new File([croppedBlob], file.name || 'cover.webp', { type: 'image/webp' });
                            return await onUploadCover(uploadFile, croppedBlob);
                        } finally {
                            setCoverUploading(false);
                        }
                    },
                }}
                onSuccess={(url) => onCoverChange(url)}
                onError={(message) => onError?.(message)}
            />
        </div>
    );
}
