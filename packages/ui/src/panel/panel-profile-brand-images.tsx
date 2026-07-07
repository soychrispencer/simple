'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
    IconChevronRight,
    IconExternalLink,
    IconLoader2,
    IconMap,
    IconMapPin,
    IconPlus,
} from '@tabler/icons-react';
import { resolveAppMediaUrl, RAW_IMAGE_MAX_SIZE_KB } from '@simple/utils';
import { AvatarUpload, type AvatarUploadHandle } from '../avatar-upload.js';
import { BUSINESS_BRAND_IMAGES_HINT } from './business-copy.js';

const DEFAULT_BRAND_HINT = BUSINESS_BRAND_IMAGES_HINT;

export type PanelProfileBrandPreviewVariant =
    | 'profile-page'
    | 'marketplace-card'
    /** @deprecated Usar profile-page */
    | 'agenda'
    /** @deprecated Usar marketplace-card */
    | 'overlay';

function resolvePreviewVariant(variant: PanelProfileBrandPreviewVariant): 'profile-page' | 'marketplace-card' {
    if (variant === 'profile-page' || variant === 'agenda') return 'profile-page';
    return 'marketplace-card';
}

function initialsFromName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
}

export type PanelProfileBrandImagesProps = {
    displayName: string;
    logoUrl: string | null;
    coverUrl: string | null;
    onLogoChange: (url: string) => void;
    onCoverChange: (url: string) => void;
    onUploadLogo: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
    onUploadCover: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
    onError?: (message: string) => void;
    /** Subtítulo en tarjeta marketplace (ubicación o titular). */
    subtitle?: string | null;
    subtitleVariant?: 'text' | 'location';
    /** Línea destacada en profile-page (rubro Agenda, tipo operador marketplace). */
    profession?: string | null;
    /** Ubicación opcional bajo el nombre en profile-page. */
    location?: string | null;
    previewVariant?: PanelProfileBrandPreviewVariant;
    /** Texto del botón inferior en marketplace-card. */
    marketplaceCtaLabel?: string;
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
    profession,
    location,
    previewVariant = 'marketplace-card',
    marketplaceCtaLabel = 'Ver perfil',
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

    const resolvedVariant = resolvePreviewVariant(previewVariant);
    const isProfilePage = resolvedVariant === 'profile-page';
    const imageUploading = coverUploading || logoUploading || disabled;
    const resolvedLogoUrl = resolveAppMediaUrl(logoUrl);
    const resolvedCoverUrl = resolveAppMediaUrl(coverUrl);
    const hasLogo = Boolean(resolvedLogoUrl && !logoLoadError);
    const logoActionLabel = hasLogo ? `Cambiar ${logoLabel}` : `Agregar ${logoLabel}`;
    const coverActionLabel = coverUrl ? 'Cambiar portada' : 'Agregar portada';
    const resolvedName = displayName.trim() || 'Tu perfil público';
    const resolvedSubtitle = subtitle?.trim() || null;
    const resolvedProfession = profession?.trim() || null;
    const resolvedLocation = location?.trim() || null;
    const previewLabel = isProfilePage
        ? 'Vista previa de tu página pública'
        : 'Vista previa de tu tarjeta en el directorio';
    const previewLinkLabel = isProfilePage ? 'Abrir página completa' : 'Abrir tarjeta completa';

    const coverEditButton = (
        <button
            type="button"
            onClick={() => coverUploadRef.current?.openPicker()}
            disabled={imageUploading}
            className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/60 disabled:opacity-60"
            aria-label={coverActionLabel}
        >
            {coverUploading ? (
                <IconLoader2 size={14} className="animate-spin" aria-hidden />
            ) : (
                <IconPlus size={14} stroke={2.5} aria-hidden />
            )}
            {coverActionLabel}
        </button>
    );

    const logoEditButton = (
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
    );

    const logoAvatar = (
        <div className="relative shrink-0">
            <div
                className={
                    isProfilePage
                        ? 'flex size-20 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold shadow-lg sm:size-24 sm:text-2xl'
                        : 'flex size-14 items-center justify-center overflow-hidden rounded-[14px] border-2 border-white/90 bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)] shadow-md sm:size-16 sm:text-xl'
                }
                style={
                    isProfilePage
                        ? {
                            border: '4px solid var(--bg)',
                            background: hasLogo
                                ? undefined
                                : 'linear-gradient(135deg, var(--accent-soft) 0%, var(--accent-subtle, var(--accent-soft)) 100%)',
                            color: hasLogo ? 'transparent' : 'var(--accent)',
                        }
                        : undefined
                }
            >
                {hasLogo ? (
                    <img
                        src={resolvedLogoUrl!}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setLogoLoadError(true)}
                    />
                ) : (
                    <span>{initialsFromName(resolvedName)}</span>
                )}
            </div>
            {logoEditButton}
        </div>
    );

    const marketplaceHero = (
        <div className="relative aspect-video max-h-[220px] w-full overflow-hidden bg-[var(--bg-subtle)] sm:max-h-[240px]">
            {resolvedCoverUrl ? (
                <img
                    src={resolvedCoverUrl}
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
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-black/0"
                aria-hidden
            />

            {coverEditButton}

            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-3.5 sm:p-4">
                {logoAvatar}

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
                            Ubicación visible en el directorio
                        </p>
                    )}
                </div>
            </div>
        </div>
    );

    const marketplaceCardPreview = (
        <div
            className="mx-auto w-full max-w-lg overflow-hidden rounded-[1.1rem] border shadow-sm ring-1 ring-black/[0.03] dark:ring-white/10"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            {marketplaceHero}

            <div className="flex flex-col gap-3.5 p-4">
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <p
                            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Cobertura
                        </p>
                        <p
                            className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            <IconMap size={15} className="shrink-0" style={{ color: 'var(--accent)' }} aria-hidden />
                            <span className="truncate" title={resolvedSubtitle ?? undefined}>
                                {resolvedSubtitle ?? 'Por confirmar'}
                            </span>
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p
                            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Desde
                        </p>
                        <p className="mt-1 text-xl font-bold leading-none tracking-tight" style={{ color: 'var(--fg)' }}>
                            —
                        </p>
                    </div>
                </div>

                <div
                    className="flex items-start justify-between gap-3 border-t pt-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="min-w-0">
                        <p
                            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Servicio principal
                        </p>
                        <p className="mt-1 truncate text-base font-semibold" style={{ color: 'var(--fg)' }}>
                            {resolvedSubtitle ?? 'Servicio destacado'}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            Configura servicios en Mi negocio
                        </p>
                    </div>
                </div>

                <span
                    className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast, #fff)' }}
                >
                    {marketplaceCtaLabel}
                    <IconChevronRight size={16} aria-hidden />
                </span>
            </div>
        </div>
    );

    const profilePagePreview = (
        <div
            className="mx-auto w-full max-w-lg overflow-hidden rounded-[1.1rem] border shadow-sm ring-1 ring-black/[0.03] dark:ring-white/10"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
            <div className="flex flex-col items-center px-4 pt-4">
                <div className="relative w-full">
                    <div
                        className="relative w-full overflow-hidden rounded-2xl shadow-sm"
                        style={{
                            height: 180,
                            background: resolvedCoverUrl
                                ? undefined
                                : 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 40%, #1a1a2e) 50%, #0f0f23 100%)',
                        }}
                    >
                        {resolvedCoverUrl ? (
                            <img
                                src={resolvedCoverUrl}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : null}
                        {coverEditButton}
                    </div>

                    <div className="absolute left-1/2 z-10 -translate-x-1/2" style={{ bottom: -32 }}>
                        {logoAvatar}
                    </div>
                </div>

                <div className="flex w-full flex-col items-center px-2 pb-5 pt-11 text-center">
                    <h3 className="max-w-full truncate text-xl font-bold" style={{ color: 'var(--fg)' }} title={resolvedName}>
                        {resolvedName}
                    </h3>
                    {resolvedProfession ? (
                        <p className="mt-1 max-w-full truncate text-sm font-semibold" style={{ color: 'var(--accent)' }} title={resolvedProfession}>
                            {resolvedProfession}
                        </p>
                    ) : (
                        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Rubro o especialidad
                        </p>
                    )}
                    {resolvedLocation ? (
                        <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <IconMapPin size={12} aria-hidden />
                            <span className="truncate" title={resolvedLocation}>{resolvedLocation}</span>
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );

    return (
        <div className={className ? `grid gap-3 ${className}` : 'grid gap-3'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    {previewLabel}
                </p>
                {previewHref ? (
                    <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: 'var(--accent)' }}
                    >
                        {previewLinkLabel}
                        <IconExternalLink size={13} aria-hidden />
                    </a>
                ) : null}
            </div>

            {isProfilePage ? profilePagePreview : marketplaceCardPreview}

            <p
                className="text-center text-xs leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
            >
                {hint ?? DEFAULT_BRAND_HINT}
            </p>

            <AvatarUpload
                ref={logoUploadRef}
                hideTrigger
                currentUrl={resolvedLogoUrl}
                config={{
                    maxSize: RAW_IMAGE_MAX_SIZE_KB,
                    maxWidth: 512,
                    maxHeight: 512,
                    aspectRatio: 1,
                    circular: false,
                    shape: 'card',
                    onUpload: async (file, croppedBlob) => {
                        setLogoUploading(true);
                        try {
                            const uploadFile = croppedBlob === file
                                ? file
                                : new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
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
                currentUrl={resolvedCoverUrl}
                config={{
                    maxSize: RAW_IMAGE_MAX_SIZE_KB,
                    maxWidth: 1600,
                    maxHeight: 900,
                    aspectRatio: 16 / 9,
                    circular: false,
                    shape: 'card',
                    onUpload: async (file, croppedBlob) => {
                        setCoverUploading(true);
                        try {
                            const uploadFile = croppedBlob === file
                                ? file
                                : new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
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
