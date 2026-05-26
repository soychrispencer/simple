'use client';

import { useRef, useState } from 'react';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import { AvatarUpload, type AvatarUploadHandle } from '@simple/ui/media';
import { serenatasApi } from '@/lib/serenatas-api';

const COVER_PLACEHOLDER_STYLE = {
    background:
        'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 40%, #1a1a2e) 50%, #0f0f23 100%)',
} as const;

type ProviderGroupBrandImagesProps = {
    className?: string;
    name: string;
    logoUrl: string;
    coverUrl: string;
    onLogoChange: (url: string) => void;
    onCoverChange: (url: string) => void;
    onError?: (message: string) => void;
};

export function ProviderGroupBrandImages({
    className,
    name,
    logoUrl,
    coverUrl,
    onLogoChange,
    onCoverChange,
    onError,
}: ProviderGroupBrandImagesProps) {
    const logoUploadRef = useRef<AvatarUploadHandle>(null);
    const coverUploadRef = useRef<AvatarUploadHandle>(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoLoadError, setLogoLoadError] = useState(false);

    const initial = name.trim().charAt(0).toUpperCase() || '?';
    const imageUploading = coverUploading || logoUploading;

    return (
        <div className={className ? `grid gap-3 ${className}` : 'grid gap-3'}>
            <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
                <div className="relative">
                    <div
                        className="aspect-[16/9] w-full bg-cover bg-center bg-accent-soft"
                        style={
                            coverUrl
                                ? { backgroundImage: `url('${encodeURI(coverUrl)}')` }
                                : COVER_PLACEHOLDER_STYLE
                        }
                    />
                    <button
                        type="button"
                        onClick={() => coverUploadRef.current?.openPicker()}
                        disabled={imageUploading}
                        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-60"
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                        aria-label={coverUrl ? 'Cambiar portada' : 'Agregar portada'}
                    >
                        {coverUploading ? (
                            <IconLoader2 size={14} className="animate-spin" aria-hidden />
                        ) : (
                            <IconPlus size={14} stroke={2.5} aria-hidden />
                        )}
                        {coverUrl ? 'Cambiar portada' : 'Agregar portada'}
                    </button>
                </div>

                <div className="p-5">
                    <div className="-mt-12 flex items-end gap-4">
                        <div className="relative shrink-0">
                            <div className="flex size-20 items-center justify-center overflow-hidden rounded-card border-4 border-surface bg-accent-soft text-xl font-bold text-accent shadow-sm sm:size-24">
                                {logoUrl && !logoLoadError ? (
                                    <img
                                        src={logoUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={() => setLogoLoadError(true)}
                                    />
                                ) : (
                                    initial
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => logoUploadRef.current?.openPicker()}
                                disabled={imageUploading}
                                className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{
                                    borderColor: 'var(--surface, var(--bg))',
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast, #fff)',
                                }}
                                aria-label={logoUrl ? 'Cambiar logo' : 'Agregar logo'}
                            >
                                {logoUploading ? (
                                    <IconLoader2 size={14} className="animate-spin" aria-hidden />
                                ) : (
                                    <IconPlus size={16} stroke={2.5} aria-hidden />
                                )}
                            </button>
                        </div>
                        <div className="min-w-0 pb-1">
                            <p className="truncate text-base font-semibold text-fg">
                                {name.trim() || 'Tu mariachi'}
                            </p>
                            <p className="text-xs text-fg-muted">Vista previa del marketplace</p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
                        <strong className="text-fg">Obligatorio para publicar:</strong> portada 16:9
                        recomendada 1600x900 px y logo cuadrado recomendado 512x512 px. Son las mismas
                        proporciones que se usan en la tarjeta y en la ficha pública.
                    </div>
                </div>
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
                    onUpload: async (_file, croppedBlob) => {
                        setLogoUploading(true);
                        try {
                            const uploadFile = new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                            const result = await serenatasApi.uploadAvatar(uploadFile, 'logo.webp', 'avatar');
                            if (!result.ok || !result.url) {
                                throw new Error(result.error ?? 'No pudimos subir el logo.');
                            }
                            return { url: result.url };
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
                    onUpload: async (_file, croppedBlob) => {
                        setCoverUploading(true);
                        try {
                            const uploadFile = new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                            const result = await serenatasApi.uploadAvatar(uploadFile, 'cover.webp', 'cover');
                            if (!result.ok || !result.url) {
                                throw new Error(result.error ?? 'No pudimos subir la portada.');
                            }
                            return { url: result.url };
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
