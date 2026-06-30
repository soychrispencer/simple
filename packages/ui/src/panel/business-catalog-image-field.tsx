'use client';

import { useRef, useState } from 'react';
import { IconLoader2, IconPhoto, IconTrash } from '@tabler/icons-react';
import { resolveAppMediaUrl, uploadMediaFile } from '@simple/utils';
import { AvatarUpload, type AvatarUploadHandle } from '../avatar-upload.js';
import { PanelButton } from './panel-button.js';
import { PanelField } from './panel-display.js';
import {
    BUSINESS_CATALOG_IMAGE_FRAME_CLASS,
    BUSINESS_CATALOG_IMAGE_MEDIA_CLASS,
} from './business-catalog-image-styles.js';

export type BusinessCatalogImageFieldProps = {
    label?: string;
    hint?: string;
    imageUrl?: string | null;
    disabled?: boolean;
    onChange: (url: string | null) => void;
    onError?: (message: string) => void;
    /** Sube el WebP recortado. Por defecto usa `/api/media/upload`. */
    onUpload?: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
};

const DEFAULT_HINT = 'Recorta la imagen y se guarda en WebP para ahorrar espacio. Al reemplazarla, la anterior se elimina del servidor.';

export function BusinessCatalogImageField({
    label = 'Imagen',
    hint = DEFAULT_HINT,
    imageUrl,
    disabled = false,
    onChange,
    onError,
    onUpload,
}: BusinessCatalogImageFieldProps) {
    const uploadRef = useRef<AvatarUploadHandle>(null);
    const [uploading, setUploading] = useState(false);
    const resolvedUrl = resolveAppMediaUrl(imageUrl);

    async function defaultUpload(_file: File, croppedBlob: Blob) {
        const uploadFile = new File([croppedBlob], 'catalog.webp', { type: 'image/webp' });
        const result = await uploadMediaFile(uploadFile, { fileType: 'image', purpose: 'default' });
        if (!result.ok || !result.result?.url) {
            throw new Error(result.error ?? 'No se pudo subir la imagen.');
        }
        return { url: result.result.url };
    }

    return (
        <PanelField label={label} hint={hint} className="md:col-span-2">
            <div className="flex flex-col gap-3 sm:max-w-sm">
                <div className={`relative aspect-[4/3] w-full border border-border ${BUSINESS_CATALOG_IMAGE_FRAME_CLASS}`}>
                    {resolvedUrl ? (
                        <img src={resolvedUrl} alt="" className={BUSINESS_CATALOG_IMAGE_MEDIA_CLASS} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-fg-muted">
                            <IconPhoto size={28} stroke={1.5} aria-hidden />
                            <span className="text-sm">Sin imagen</span>
                        </div>
                    )}
                    {uploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                            <IconLoader2 size={22} className="animate-spin" aria-hidden />
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                    <PanelButton
                        variant="secondary"
                        size="sm"
                        disabled={disabled || uploading}
                        onClick={() => uploadRef.current?.openPicker()}
                    >
                        {resolvedUrl ? 'Cambiar imagen' : 'Agregar imagen'}
                    </PanelButton>
                    {resolvedUrl ? (
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            disabled={disabled || uploading}
                            onClick={() => onChange(null)}
                        >
                            <IconTrash size={14} aria-hidden />
                            Quitar
                        </PanelButton>
                    ) : null}
                </div>

                <AvatarUpload
                    ref={uploadRef}
                    hideTrigger
                    currentUrl={resolvedUrl}
                    config={{
                        maxSize: 8192,
                        maxWidth: 1200,
                        maxHeight: 900,
                        aspectRatio: 4 / 3,
                        circular: false,
                        shape: 'card',
                        onUpload: async (file, croppedBlob) => {
                            setUploading(true);
                            try {
                                const upload = onUpload ?? defaultUpload;
                                return await upload(file, croppedBlob);
                            } finally {
                                setUploading(false);
                            }
                        },
                    }}
                    onSuccess={(url) => onChange(url?.trim() ? url : null)}
                    onError={(message) => onError?.(message)}
                />
            </div>
        </PanelField>
    );
}
