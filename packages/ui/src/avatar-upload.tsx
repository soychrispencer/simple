'use client';

import { forwardRef, useImperativeHandle, useState, useCallback, useEffect } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { IconPlus } from '@tabler/icons-react';

export type AvatarUploadConfig = {
    maxSize?: number; // in KB
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
    circular?: boolean;
    onUpload?: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
};

export type AvatarUploadHandle = {
    openPicker: () => void;
};

export type AvatarUploadProps = {
    currentUrl?: string | null;
    config?: AvatarUploadConfig;
    onSuccess?: (url: string) => void;
    onError?: (error: string) => void;
    /** `overlay`: círculo con botón + (estilo Instagram). `default`: botones laterales. */
    variant?: 'default' | 'overlay';
    /** Oculta botones propios; usar con `ref` para abrir el selector desde fuera. */
    hideTrigger?: boolean;
};

export const AvatarUpload = forwardRef<AvatarUploadHandle, AvatarUploadProps>(function AvatarUpload(
    {
        currentUrl,
        config = {},
        onSuccess,
        onError,
        variant = 'default',
        hideTrigger = false,
    },
    ref,
) {
    const [imageUrl, setImageUrl] = useState<string | null>(currentUrl || null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showGrid, setShowGrid] = useState(true);

    const {
        maxSize = 5120, // 5MB
        maxWidth = 400,
        maxHeight = 400,
        aspectRatio = 1,
        circular = true,
        onUpload,
    } = config;

    useEffect(() => {
        setImageUrl(currentUrl || null);
    }, [currentUrl]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > maxSize * 1024) {
            onError?.(`La imagen es muy grande. Máximo ${maxSize}KB`);
            return;
        }

        if (!file.type.startsWith('image/')) {
            onError?.('Solo se permiten archivos de imagen');
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setImageUrl(reader.result as string);
            setIsModalOpen(true);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            setCroppedArea(null);
        };
        reader.readAsDataURL(file);
    }, [maxSize, onError]);

    const openFilePicker = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => handleFileSelect(e as unknown as React.ChangeEvent<HTMLInputElement>);
        input.click();
    }, [handleFileSelect]);

    useImperativeHandle(ref, () => ({ openPicker: openFilePicker }), [openFilePicker]);

    const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedArea(croppedAreaPixels);
    }, []);

    const handleSave = useCallback(async () => {
        if (!croppedArea || !selectedFile || !imageUrl) return;

        setIsUploading(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo crear el canvas');

            const image = new Image();
            image.src = imageUrl;

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            canvas.width = maxWidth;
            canvas.height = maxHeight;

            ctx.drawImage(
                image,
                croppedArea.x,
                croppedArea.y,
                croppedArea.width,
                croppedArea.height,
                0,
                0,
                maxWidth,
                maxHeight,
            );

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    onError?.('Error al procesar la imagen');
                    setIsUploading(false);
                    return;
                }

                try {
                    if (onUpload) {
                        const result = await onUpload(selectedFile, blob);
                        setImageUrl(result.url);
                        onSuccess?.(result.url);
                    } else {
                        const croppedUrl = URL.createObjectURL(blob);
                        setImageUrl(croppedUrl);
                        onSuccess?.(croppedUrl);
                    }
                    setIsModalOpen(false);
                } catch {
                    onError?.('Error al subir la imagen');
                } finally {
                    setIsUploading(false);
                }
            }, 'image/webp', 0.9);
        } catch {
            onError?.('Error al procesar la imagen');
            setIsUploading(false);
        }
    }, [croppedArea, selectedFile, imageUrl, maxWidth, maxHeight, onUpload, onSuccess, onError]);

    const handleCancel = useCallback(() => {
        setIsModalOpen(false);
        setImageUrl(currentUrl || null);
        setSelectedFile(null);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setCroppedArea(null);
    }, [currentUrl]);

    const handleRemove = useCallback(() => {
        setImageUrl(null);
        onSuccess?.('');
    }, [onSuccess]);

    const shapeClass = circular ? 'rounded-full' : 'rounded-lg';
    const previewSize = Math.min(maxWidth, maxHeight);

    const avatarPreview = (
        <div
            className={`relative shrink-0 overflow-hidden ${shapeClass} ring-2 ring-[var(--border)]`}
            style={{ width: previewSize, height: previewSize, background: 'var(--bg-subtle)' }}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt=""
                    className={`h-full w-full object-cover ${shapeClass}`}
                />
            ) : (
                <div
                    className={`flex h-full w-full items-center justify-center ${shapeClass}`}
                    style={{ color: 'var(--fg-muted)' }}
                >
                    <svg className="h-1/2 w-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                    </svg>
                </div>
            )}
        </div>
    );

    return (
        <>
            {!hideTrigger && variant === 'overlay' ? (
                <div className="relative inline-block" style={{ width: previewSize, height: previewSize }}>
                    {avatarPreview}
                    <button
                        type="button"
                        onClick={openFilePicker}
                        className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm transition-opacity hover:opacity-90"
                        style={{
                            borderColor: 'var(--surface, #fff)',
                            background: 'var(--accent)',
                            color: 'var(--accent-contrast, #fff)',
                        }}
                        aria-label={imageUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
                    >
                        <IconPlus size={16} stroke={2.5} aria-hidden />
                    </button>
                </div>
            ) : !hideTrigger ? (
                <div className="relative inline-flex items-center gap-4">
                    {avatarPreview}
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="panel-button rounded-button border px-4 py-2 text-sm font-medium"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            Cambiar foto
                        </button>
                        {imageUrl ? (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="panel-button rounded-button border px-4 py-2 text-sm font-medium"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                            >
                                Eliminar
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {isModalOpen && imageUrl ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl p-6"
                        style={{ background: 'var(--bg)' }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                                Ajustar foto
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowGrid(!showGrid)}
                                className="rounded-lg px-3 py-1 text-xs"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            >
                                {showGrid ? 'Ocultar guía' : 'Mostrar guía'}
                            </button>
                        </div>
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '400px',
                                backgroundColor: 'var(--bg-subtle)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                            }}
                        >
                            <Cropper
                                image={imageUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={handleCropComplete}
                                showGrid={showGrid}
                                cropShape={circular ? 'round' : 'rect'}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="mb-2 block text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Zoom
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full"
                                style={{ accentColor: 'var(--accent)' }}
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="panel-button rounded-button border px-4 py-2 text-sm font-medium"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isUploading}
                                className="panel-button rounded-button border px-4 py-2 text-sm font-medium"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                    opacity: isUploading ? 0.5 : 1,
                                }}
                            >
                                {isUploading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
});
