'use client';

import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

export type AvatarUploadConfig = {
    maxSize?: number; // in KB
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
    circular?: boolean;
    onUpload?: (file: File, croppedBlob: Blob) => Promise<{ url: string }>;
};

export type AvatarUploadProps = {
    currentUrl?: string | null;
    config?: AvatarUploadConfig;
    onSuccess?: (url: string) => void;
    onError?: (error: string) => void;
};

export function AvatarUpload({ currentUrl, config = {}, onSuccess, onError }: AvatarUploadProps) {
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

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size
        if (file.size > maxSize * 1024) {
            onError?.(`La imagen es muy grande. Máximo ${maxSize}KB`);
            return;
        }

        // Validate file type
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

    const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
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
                maxHeight
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
                        // Default: return the blob as data URL
                        const croppedUrl = URL.createObjectURL(blob);
                        setImageUrl(croppedUrl);
                        onSuccess?.(croppedUrl);
                    }
                    setIsModalOpen(false);
                } catch (error) {
                    onError?.('Error al subir la imagen');
                } finally {
                    setIsUploading(false);
                }
            }, 'image/jpeg', 0.95);
        } catch (error) {
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

    return (
        <>
            <div className="relative inline-flex items-center gap-4">
                <div className={`relative ${circular ? 'rounded-full' : 'rounded-lg'} overflow-hidden`} style={{ background: 'var(--bg-subtle)' }}>
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Avatar"
                            className={`object-cover ${circular ? 'rounded-full' : 'rounded-lg'}`}
                            style={{ width: maxWidth, height: maxHeight }}
                        />
                    ) : (
                        <div
                            className={`flex items-center justify-center ${circular ? 'rounded-full' : 'rounded-lg'}`}
                            style={{ width: maxWidth, height: maxHeight, color: 'var(--fg-muted)' }}
                        >
                            <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => handleFileSelect(e as any);
                            input.click();
                        }}
                        className="panel-button px-4 py-2 text-sm font-medium rounded-button border"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        Cambiar foto
                    </button>
                    {imageUrl && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="panel-button px-4 py-2 text-sm font-medium rounded-button border"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                        >
                            Eliminar
                        </button>
                    )}
                </div>
            </div>

            {isModalOpen && imageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col" style={{ background: 'var(--bg)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>Ajustar foto</h3>
                            <button
                                type="button"
                                onClick={() => setShowGrid(!showGrid)}
                                className="px-3 py-1 text-xs rounded-lg"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            >
                                {showGrid ? 'Ocultar guía' : 'Mostrar guía'}
                            </button>
                        </div>
                        <div style={{ position: 'relative', width: '100%', height: '400px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
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
                            <label className="block text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Zoom</label>
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
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="panel-button px-4 py-2 text-sm font-medium rounded-button border"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isUploading}
                                className="panel-button px-4 py-2 text-sm font-medium rounded-button border"
                                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', opacity: isUploading ? 0.5 : 1 }}
                            >
                                {isUploading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
