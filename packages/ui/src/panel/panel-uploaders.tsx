'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes';
import { PanelButton } from './panel-button.js';
import { PanelNotice } from './panel-primitives.js';

export type PanelMediaAsset = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    isCover: boolean;
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
};

export type PanelDocumentAsset = {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
};

export type PanelVideoAsset = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    durationSeconds: number;
};

export type PanelMediaUploaderProps = {
    items: PanelMediaAsset[];
    onChange: (items: PanelMediaAsset[]) => void;
    minItems?: number;
    recommendedItems?: number;
    maxItems?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    targetBytes?: number;
    className?: string;
    dropzoneTitle?: string;
    dropzoneDescription?: string;
    helperText?: string;
    emptyHint?: string;
    guidanceTitle?: string;
    guidanceDescription?: string;
    guidedSlots?: ReadonlyArray<{
        key: string;
        label: string;
    }>;
};

export type PanelVideoUploaderProps = {
    asset: PanelVideoAsset | null;
    onChange: (asset: PanelVideoAsset | null) => void;
    className?: string;
    title?: string;
    description?: string;
    helperText?: string;
    maxBytes?: number;
    requiredAspectRatio?: number;
    aspectRatioTolerance?: number;
};

export type PanelDocumentUploaderProps = {
    items: PanelDocumentAsset[];
    onChange: (items: PanelDocumentAsset[]) => void;
    className?: string;
    title?: string;
    description?: string;
    helperText?: string;
    maxItems?: number;
    maxBytes?: number;
};

function createPanelMediaId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function estimateDataUrlBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Math.ceil((payload.length * 3) / 4);
}

async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        image.src = dataUrl;
    });
}

async function loadVideoMetadata(file: File): Promise<{ width: number; height: number; durationSeconds: number }> {
    return await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const objectUrl = URL.createObjectURL(file);
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.onloadedmetadata = null;
            video.onloadeddata = null;
            video.oncanplay = null;
            video.onerror = null;
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(objectUrl);
        };

        const finish = (result: { width: number; height: number; durationSeconds: number } | null, error?: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (result) resolve(result);
            else reject(error ?? new Error('No pudimos abrir este video. Usa MP4 H.264, WEBM o MOV compatible.'));
        };

        const tryResolve = () => {
            if (!video.videoWidth || !video.videoHeight) return false;
            finish({
                width: video.videoWidth,
                height: video.videoHeight,
                durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
            });
            return true;
        };

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
            if (tryResolve()) return;
        };
        video.onloadeddata = () => {
            if (tryResolve()) return;
        };
        video.oncanplay = () => {
            if (tryResolve()) return;
        };
        video.onerror = () => {
            finish(null, new Error('No pudimos abrir este video. Usa MP4 H.264, WEBM o MOV compatible.'));
        };
        timeoutId = setTimeout(() => {
            finish({
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
                durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
            });
        }, 5000);
        video.src = objectUrl;
        video.load();
    });
}

function renderImageToWebpDataUrl(
    image: HTMLImageElement,
    width: number,
    height: number,
    quality: number
): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', quality);
}

async function optimizeImageToWebp(params: {
    file: File;
    maxWidth: number;
    maxHeight: number;
    minWidth: number;
    minHeight: number;
    targetBytes: number;
}): Promise<PanelMediaAsset> {
    const sourceDataUrl = await fileToDataUrl(params.file);
    const image = await loadImage(sourceDataUrl);

    if (image.width < params.minWidth || image.height < params.minHeight) {
        throw new Error(`La imagen ${params.file.name} debe tener al menos ${params.minWidth} x ${params.minHeight} px.`);
    }

    let width = image.width;
    let height = image.height;
    const initialScale = Math.min(1, params.maxWidth / width, params.maxHeight / height);
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    let quality = 0.86;
    let currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
    if (!currentDataUrl) {
        throw new Error(`No se pudo procesar la imagen ${params.file.name}.`);
    }

    while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && quality > 0.54) {
        quality -= 0.07;
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && width > 720 && height > 480) {
        width = Math.max(params.minWidth, Math.round(width * 0.9));
        height = Math.max(params.minHeight, Math.round(height * 0.9));
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    const normalizedName = params.file.name.replace(/\.[^.]+$/, '') || 'imagen';

    return {
        id: createPanelMediaId(),
        name: `${normalizedName}.webp`,
        dataUrl: currentDataUrl,
        previewUrl: currentDataUrl,
        isCover: false,
        width,
        height,
        sizeBytes: estimateDataUrlBytes(currentDataUrl),
        mimeType: 'image/webp',
    };
}

function normalizePanelMediaCover(items: PanelMediaAsset[]) {
    if (items.length === 0) return items;
    const coverId = items.find((item) => item.isCover)?.id ?? items[0].id;
    const reordered = [...items].sort((left, right) => {
        if (left.id === coverId) return -1;
        if (right.id === coverId) return 1;
        return 0;
    });
    return reordered.map((item, index) => ({ ...item, isCover: index === 0 && item.id === coverId }));
}

function reorderPanelMedia(items: PanelMediaAsset[], fromId: string, toId: string) {
    if (fromId === toId) return items;
    const next = [...items];
    const fromIndex = next.findIndex((item) => item.id === fromId);
    const toIndex = next.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1) return items;
    const moved = next[fromIndex];
    next[fromIndex] = next[toIndex];
    next[toIndex] = moved;
    return normalizePanelMediaCover(next);
}

function formatPanelMediaBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatPanelVideoDuration(durationSeconds: number) {
    const safeSeconds = Math.max(0, Math.round(durationSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function createPanelDocumentAsset(file: File, maxBytes: number): PanelDocumentAsset {
    if (file.size > maxBytes) {
        throw new Error(`El archivo ${file.name} supera el máximo permitido de ${formatPanelMediaBytes(maxBytes)}.`);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
    if (!supported.has(ext)) {
        throw new Error('Sube archivos PDF, Word, Excel o PowerPoint.');
    }

    return {
        id: createPanelMediaId(),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
    };
}

async function createPanelVideoAsset(params: {
    file: File;
    maxBytes: number;
    requiredAspectRatio: number;
    aspectRatioTolerance: number;
}): Promise<PanelVideoAsset> {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const lowerName = params.file.name.toLowerCase();
    const hasAllowedExtension = lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.mov');
    if (!allowedTypes.includes(params.file.type) && !hasAllowedExtension) {
        throw new Error('Sube un video MP4, WEBM o MOV.');
    }
    if (params.file.size > params.maxBytes) {
        throw new Error(`El video no puede pesar más de ${formatPanelMediaBytes(params.maxBytes)}.`);
    }

    const metadata = await loadVideoMetadata(params.file);
    if (metadata.width && metadata.height) {
        const ratio = metadata.width / metadata.height;
        if (Math.abs(ratio - params.requiredAspectRatio) > params.aspectRatioTolerance) {
            throw new Error('El video debe estar en formato 9:16.');
        }
    }

    const dataUrl = await fileToDataUrl(params.file);
    if (!dataUrl) {
        throw new Error('No pudimos leer este video.');
    }

    return {
        id: createPanelMediaId(),
        name: params.file.name,
        dataUrl,
        previewUrl: dataUrl,
        mimeType: params.file.type || 'video/mp4',
        sizeBytes: params.file.size,
        width: metadata.width,
        height: metadata.height,
        durationSeconds: metadata.durationSeconds,
    };
}

function formatPanelVideoResolution(width: number, height: number) {
    if (!width || !height) return 'Resolución no detectada';
    return `${width} x ${height} px`;
}

function InlinePanelIcon(props: { children: ReactNode }) {
    return (
        <span
            className="inline-flex h-4 w-4 items-center justify-center"
            aria-hidden="true"
            style={{ color: 'currentColor' }}
        >
            {props.children}
        </span>
    );
}

export function PanelMediaUploader(props: PanelMediaUploaderProps) {
    const {
        items,
        onChange,
        minItems = 1,
        recommendedItems = 8,
        maxItems = 20,
        minWidth = 600,
        minHeight = 400,
        maxWidth = 1800,
        maxHeight = 1400,
        targetBytes = 420_000,
        className,
        dropzoneTitle = 'Fotos',
        helperText,
        emptyHint = 'Arrastra o selecciona',
        guidedSlots = [],
    } = props;
    const orderedItems = useMemo(() => normalizePanelMediaCover(items), [items]);
    const guidedLabels = useMemo(() => guidedSlots.map((slot) => slot.label), [guidedSlots]);
    const itemsRef = useRef(orderedItems);
    const onChangeRef = useRef(onChange);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dragStateRef = useRef<typeof dragState>(null);
    const dropTargetIdRef = useRef<string | null>(null);
    const tileRefs = useRef(new Map<string, HTMLElement>());
    const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
    const dragFrameRef = useRef<number | null>(null);
    const [fileDragActive, setFileDragActive] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
        id: string;
        startX: number;
        startY: number;
        active: boolean;
    } | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    useEffect(() => {
        itemsRef.current = orderedItems;
    }, [orderedItems]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        dragStateRef.current = dragState;
    }, [dragState]);

    useEffect(() => {
        dropTargetIdRef.current = dropTargetId;
    }, [dropTargetId]);

    useEffect(() => () => {
        if (dragFrameRef.current != null) {
            window.cancelAnimationFrame(dragFrameRef.current);
        }
    }, []);

    const addFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        if (files.length === 0) return;

        const available = Math.max(maxItems - orderedItems.length, 0);
        if (available <= 0) {
            setError(`Puedes cargar hasta ${maxItems} imágenes.`);
            return;
        }

        const selected = files
            .filter((file) => /^image\/(jpeg|jpg|png|webp)$/i.test(file.type))
            .slice(0, available);

        if (selected.length === 0) {
            setError('Sube imágenes JPG, JPEG, PNG o WEBP.');
            return;
        }

        setProcessing(true);
        setError(null);
        const nextItems = [...orderedItems];
        const issues: string[] = [];

        for (const file of selected) {
            try {
                const asset = await optimizeImageToWebp({
                    file,
                    maxWidth,
                    maxHeight,
                    minWidth,
                    minHeight,
                    targetBytes,
                });
                nextItems.push(asset);
            } catch (processingError) {
                issues.push(processingError instanceof Error ? processingError.message : `No se pudo procesar ${file.name}.`);
            }
        }

        setProcessing(false);
        onChange(normalizePanelMediaCover(nextItems));
        if (issues.length > 0) setError(issues[0]);
    };

    const removeItem = (itemId: string) => {
        onChange(normalizePanelMediaCover(orderedItems.filter((item) => item.id !== itemId)));
    };

    const setCover = (itemId: string) => {
        onChange(normalizePanelMediaCover(orderedItems.map((item) => ({ ...item, isCover: item.id === itemId }))));
    };

    const summaryHelper = helperText || `Mínimo ${minItems} · Máximo ${maxItems} · WEBP`;
    const missingRecommended = Math.max(recommendedItems - orderedItems.length, 0);
    const canOrder = orderedItems.length > 1;
    const progressPercent = recommendedItems > 0 ? Math.min((orderedItems.length / recommendedItems) * 100, 100) : 100;

    const clearDraggedTileStyles = (itemId?: string | null) => {
        if (!itemId) return;
        const tile = tileRefs.current.get(itemId);
        if (!tile) return;
        tile.style.removeProperty('transform');
        tile.style.removeProperty('opacity');
        tile.style.removeProperty('box-shadow');
        tile.style.removeProperty('z-index');
        tile.style.removeProperty('transition');
    };

    const scheduleDraggedTilePosition = () => {
        if (dragFrameRef.current != null) return;
        dragFrameRef.current = window.requestAnimationFrame(() => {
            dragFrameRef.current = null;
            const currentDrag = dragStateRef.current;
            const pointer = dragPointerRef.current;
            if (!currentDrag || !currentDrag.active || !pointer) return;
            const tile = tileRefs.current.get(currentDrag.id);
            if (!tile) return;
            const dragX = pointer.x - currentDrag.startX;
            const dragY = pointer.y - currentDrag.startY;
            tile.style.transition = 'none';
            tile.style.transform = `translate3d(${dragX}px, ${dragY}px, 0) scale(1.02)`;
            tile.style.opacity = '0.96';
            tile.style.boxShadow = '0 16px 36px rgba(0,0,0,0.22)';
            tile.style.zIndex = '30';
        });
    };

    useEffect(() => {
        if (!dragState) return;

        if (dragState.active) {
            document.body.style.setProperty('user-select', 'none');
            document.body.style.setProperty('touch-action', 'none');
        }

        const handlePointerMove = (event: globalThis.PointerEvent) => {
            const currentDrag = dragStateRef.current;
            if (!currentDrag) return;

            dragPointerRef.current = { x: event.clientX, y: event.clientY };

            const distance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
            if (!currentDrag.active && distance <= 4) {
                if (dropTargetIdRef.current !== null) setDropTargetId(null);
                return;
            }

            if (!currentDrag.active) {
                setDragState((current) => current ? { ...current, active: true } : current);
            }

            scheduleDraggedTilePosition();

            const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
            const nextHoverId = element?.closest('[data-panel-media-item-id]')?.getAttribute('data-panel-media-item-id') || null;
            const nextDropId = nextHoverId && nextHoverId !== currentDrag.id ? nextHoverId : null;
            if (dropTargetIdRef.current !== nextDropId) setDropTargetId(nextDropId);
        };

        const handlePointerEnd = () => {
            const currentDrag = dragStateRef.current;
            const currentDropTarget = dropTargetIdRef.current;
            if (currentDrag?.active && currentDrag.id && currentDropTarget && currentDrag.id !== currentDropTarget) {
                const reordered = reorderPanelMedia(itemsRef.current, currentDrag.id, currentDropTarget);
                itemsRef.current = reordered;
                onChangeRef.current(reordered);
            }
            clearDraggedTileStyles(currentDrag?.id);
            dragPointerRef.current = null;
            if (dragFrameRef.current != null) {
                window.cancelAnimationFrame(dragFrameRef.current);
                dragFrameRef.current = null;
            }
            setDragState(null);
            setDropTargetId(null);
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('touch-action');
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerEnd);
        window.addEventListener('pointercancel', handlePointerEnd);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerEnd);
            window.removeEventListener('pointercancel', handlePointerEnd);
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('touch-action');
        };
    }, [!!dragState]);

    const startPointerDrag = (event: ReactPointerEvent<HTMLElement>, item: PanelMediaAsset) => {
        if ((event.target as HTMLElement).closest('[data-panel-media-action="true"]')) return;
        event.preventDefault();
        event.stopPropagation();
        clearDraggedTileStyles(item.id);
        dragPointerRef.current = { x: event.clientX, y: event.clientY };
        setDragState({
            id: item.id,
            startX: event.clientX,
            startY: event.clientY,
            active: false,
        });
        setDropTargetId(null);
    };

    const renderPhotoTile = (item: PanelMediaAsset, index: number) => {
        const label = guidedLabels[index] || (index === 0 ? 'Portada' : `Foto ${index + 1}`);
        const isCover = index === 0;
        const isDragging = dragState?.id === item.id;
        const isActivelyDragging = isDragging && !!dragState?.active;
        const isDropTarget = dropTargetId === item.id && dragState?.id !== item.id;

        return (
            <article
                key={item.id}
                data-panel-media-item-id={item.id}
                ref={(node) => {
                    if (node) tileRefs.current.set(item.id, node);
                    else tileRefs.current.delete(item.id);
                }}
                onPointerDown={(event) => startPointerDrag(event, item)}
                className={joinClasses(
                    'relative overflow-hidden rounded-card border ease-out',
                    isActivelyDragging ? '' : 'transition-[border-color,box-shadow,opacity,transform] duration-150',
                )}
                style={{
                    borderColor: isDropTarget ? '#2563eb' : isCover ? 'var(--border-strong)' : 'var(--border)',
                    background: 'var(--surface)',
                    opacity: isActivelyDragging ? 0.52 : 1,
                    transform: isDropTarget ? 'scale(1.015)' : 'scale(1)',
                    boxShadow: isDropTarget
                        ? '0 0 0 2px rgba(37,99,235,0.16), 0 10px 26px rgba(37,99,235,0.10)'
                        : 'var(--shadow-xs)',
                    cursor: isActivelyDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    willChange: isActivelyDragging ? 'opacity' : 'auto',
                    zIndex: isActivelyDragging ? 5 : 1,
                    pointerEvents: isActivelyDragging ? 'none' : 'auto',
                }}
            >
                <div className="relative aspect-4/3 overflow-hidden rounded-card">
                    {item.previewUrl ? (
                        <img
                            src={item.previewUrl}
                            alt={label}
                            draggable={false}
                            onDragStart={(event) => event.preventDefault()}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                            Resube esta foto
                        </div>
                    )}

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        {isCover ? (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ background: 'rgba(17,24,39,0.82)', color: '#ffffff' }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 17.3L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.3Z" />
                                </svg>
                                Portada
                            </span>
                        ) : (
                            <span
                                className="rounded-full px-2 py-1 text-[10px] font-medium"
                                style={{ background: 'rgba(17,24,39,0.36)', color: 'rgba(255,255,255,0.78)' }}
                            >
                                {label}
                            </span>
                        )}
                        <button
                            type="button"
                            aria-label={`Eliminar ${label}`}
                            data-panel-media-action="true"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ background: 'rgba(17,24,39,0.76)', color: '#ffffff' }}
                            onClick={() => removeItem(item.id)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 7H20M9 7V5.5C9 4.67157 9.67157 4 10.5 4H13.5C14.3284 4 15 4.67157 15 5.5V7M10 11V17M14 11V17M6.5 7L7.2 18.2C7.26511 19.2417 8.12888 20.05 9.17252 20.05H14.8275C15.8711 20.05 16.7349 19.2417 16.8 18.2L17.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3" style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0), rgba(17,24,39,0.74))' }}>
                        <p className="min-w-0 truncate text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {item.width} x {item.height} · {formatPanelMediaBytes(item.sizeBytes)}
                        </p>
                        {!isCover ? (
                            <button
                                type="button"
                                data-panel-media-action="true"
                                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                style={{ background: 'rgba(255,255,255,0.92)', color: '#111827' }}
                                onClick={() => setCover(item.id)}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 17.3L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.3Z" />
                                </svg>
                                Portada
                            </button>
                        ) : null}
                    </div>

                    {isDropTarget ? (
                        <div
                            className="absolute inset-3 rounded-card border-2 border-dashed"
                            style={{
                                borderColor: '#2563eb',
                                background: 'rgba(37,99,235,0.10)',
                            }}
                        />
                    ) : null}

                    {isActivelyDragging || isDropTarget ? (
                        <div className="absolute inset-x-3 bottom-14 rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'rgba(17,24,39,0.76)', color: '#ffffff' }}>
                            {isActivelyDragging ? 'Moviendo…' : isDropTarget ? 'Suelta aquí' : 'Arrastra'}
                        </div>
                    ) : null}
                </div>
            </article>
        );
    };

    const renderPlaceholderTile = (label: string, index: number) => (
        <div
            key={`placeholder-${label}-${index}`}
            className="relative aspect-4/3 rounded-card border border-dashed p-4"
            style={{
                borderColor: 'color-mix(in oklab, var(--border) 86%, transparent)',
                background: 'color-mix(in oklab, var(--surface) 96%, var(--bg-subtle) 4%)',
            }}
        >
            <span className="text-[11px] font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-[20px]" style={{ background: 'color-mix(in oklab, var(--bg-subtle) 78%, transparent)', color: 'var(--fg-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4.5 18.5L8.5 13.5L12 17L14 15L19.5 20.5M7 8.5H7.01M6.8 20.5H17.2C18.8802 20.5 19.7202 20.5 20.362 20.173C20.9265 19.8854 21.3854 19.4265 21.673 18.862C22 18.2202 22 17.3802 22 15.7V8.3C22 6.61984 22 5.77976 21.673 5.13803C21.3854 4.57354 20.9265 4.1146 20.362 3.82698C19.7202 3.5 18.8802 3.5 17.2 3.5H6.8C5.11984 3.5 4.27976 3.5 3.63803 3.82698C3.07354 4.1146 2.6146 4.57354 2.32698 5.13803C2 5.77976 2 6.61984 2 8.3V15.7C2 17.3802 2 18.2202 2.32698 18.862C2.6146 19.4265 3.07354 19.8854 3.63803 20.173C4.27976 20.5 5.11984 20.5 6.8 20.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Pendiente</span>
            </div>
        </div>
    );

    return (
        <div className={joinClasses('space-y-4', className)}>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                    void addFiles(event.target.files);
                    if (inputRef.current) inputRef.current.value = '';
                }}
            />

            <div
                className="space-y-5"
                onDragOver={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setFileDragActive(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setFileDragActive(false);
                    void addFiles(event.dataTransfer.files);
                }}
            >
                <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{dropzoneTitle}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{summaryHelper}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                            <span>{orderedItems.length} / {maxItems}</span>
                            <span aria-hidden="true">•</span>
                            <span>{orderedItems.length >= minItems ? 'Listo' : `Falta ${minItems - orderedItems.length}`}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <span>
                                {missingRecommended > 0 ? `Faltan ${missingRecommended} recomendadas` : 'Cobertura recomendada completa'}
                            </span>
                            <span>Portada = primera foto</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
                            <div
                                className="h-full rounded-full transition-[width] duration-200"
                                style={{
                                    width: `${progressPercent}%`,
                                    background: 'var(--fg)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {canOrder ? 'Arrastra y suelta para ordenar' : 'La primera imagen será la portada'}
                    </p>
                </div>

                <div className="panel-media-grid">
                    <button
                        type="button"
                        className="relative aspect-4/3 rounded-card border border-dashed p-4 text-left transition-colors"
                        style={{
                            borderColor: fileDragActive ? 'var(--border-strong)' : 'color-mix(in oklab, var(--border) 86%, transparent)',
                            background: 'color-mix(in oklab, var(--surface) 96%, var(--bg-subtle) 4%)',
                        }}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span
                                className="inline-flex h-14 w-14 items-center justify-center rounded-[20px]"
                                style={{
                                    background: fileDragActive ? 'var(--surface)' : 'color-mix(in oklab, var(--bg-subtle) 78%, transparent)',
                                    color: 'var(--fg-muted)',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M12 16V7M12 7L8.5 10.5M12 7L15.5 10.5M5 17.5V18.5C5 19.6046 5.89543 20.5 7 20.5H17C18.1046 20.5 19 19.6046 19 18.5V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                {processing ? 'Procesando…' : emptyHint}
                            </span>
                        </div>
                    </button>

                    {orderedItems.map((item, index) => renderPhotoTile(item, index))}
                    {guidedLabels.slice(orderedItems.length).map((label, index) => renderPlaceholderTile(label, index))}
                </div>
            </div>

            {error ? <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
        </div>
    );
}
export function PanelVideoUploader(props: PanelVideoUploaderProps) {
    const {
        asset,
        onChange,
        className,
        title = 'Video para Descubre',
        description = 'Opcional · clip vertical 9:16 para Descubre.',
        helperText = 'MP4, WEBM o MOV · hasta 10 MB · 9:16.',
        maxBytes = 10 * 1024 * 1024,
        requiredAspectRatio = 9 / 16,
        aspectRatioTolerance = 0.06,
    } = props;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadVideo = async (fileList: FileList | null) => {
        const file = fileList?.[0];
        if (!file) return;
        setProcessing(true);
        setError(null);
        try {
            const next = await createPanelVideoAsset({
                file,
                maxBytes,
                requiredAspectRatio,
                aspectRatioTolerance,
            });
            onChange(next);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'No se pudo procesar el video.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={joinClasses('space-y-3', className)}>
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                {description ? <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p> : null}
            </div>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDragging(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void loadVideo(event.dataTransfer.files);
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(event) => {
                        void loadVideo(event.target.files);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                />

                {asset ? (
                    <div className="space-y-3">
                        <div className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                <div className="shrink-0 rounded-card border p-1.5 shadow-sm" style={{ width: '116px', borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="relative w-[116px] overflow-hidden rounded-card border" style={{ borderColor: 'color-mix(in oklab, var(--border) 80%, transparent)', background: '#020617' }}>
                                        <video
                                            src={asset.previewUrl}
                                            muted
                                            playsInline
                                            preload="metadata"
                                            className="aspect-[9/16] h-auto w-full bg-black object-cover"
                                        />
                                        <div className="absolute inset-x-0 top-0 h-14" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.55), rgba(15,23,42,0))' }} />
                                        <div className="absolute left-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'rgba(255,255,255,0.24)' }} />
                                        <div className="absolute inset-x-3 top-6 flex items-center justify-between text-[8px] font-medium text-white/85">
                                            <span>Descubre</span>
                                            <span>Preview</span>
                                        </div>
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border text-white" style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                    <path d="M8.5 6.5V17.5L17 12L8.5 6.5Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{asset.name}</p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {formatPanelVideoResolution(asset.width, asset.height)} · {formatPanelVideoDuration(asset.durationSeconds)} · {formatPanelMediaBytes(asset.sizeBytes)}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <PanelButton type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                                            Reemplazar
                                        </PanelButton>
                                        <PanelButton type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                                            Quitar
                                        </PanelButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-full overflow-hidden rounded-card border-2 border-dashed p-4 transition-colors sm:p-5"
                        style={{
                            borderColor: dragging ? 'var(--border-strong)' : 'var(--border)',
                            background: dragging ? 'color-mix(in oklab, var(--surface) 98%, var(--bg-subtle) 2%)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M15 10L19 7V17L15 14M5 19H13C14.1046 19 15 18.1046 15 17V7C15 5.89543 14.1046 5 13 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    {processing ? 'Procesando video...' : 'Subir clip vertical 9:16'}
                                </p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Material promocional vertical para aparecer en el feed Descubre.
                                </p>
                                <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{helperText}</p>
                            </div>
                            <div className="flex shrink-0 justify-start sm:ml-auto sm:justify-end">
                                <PanelButton type="button" variant="secondary" disabled={processing} onClick={() => inputRef.current?.click()}>
                                    {processing ? 'Procesando...' : 'Seleccionar video'}
                                </PanelButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
        </div>
    );
}

export function PanelDocumentUploader(props: PanelDocumentUploaderProps) {
    const {
        items,
        onChange,
        className,
        title = 'Documentos y PDF',
        description = 'Adjunta documentos de apoyo, legales o comerciales.',
        helperText = 'PDF, Word, Excel o PowerPoint · hasta 8 archivos · máximo 15 MB cada uno.',
        maxItems = 8,
        maxBytes = 15 * 1024 * 1024,
    } = props;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addFiles = (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        if (files.length === 0) return;
        const available = Math.max(maxItems - items.length, 0);
        if (available <= 0) {
            setError(`Puedes cargar hasta ${maxItems} documentos.`);
            return;
        }

        const nextItems = [...items];
        try {
            files.slice(0, available).forEach((file) => {
                nextItems.push(createPanelDocumentAsset(file, maxBytes));
            });
            setError(null);
            onChange(nextItems);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'No se pudo procesar el archivo.');
        }
    };

    const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

    return (
        <div className={joinClasses('space-y-3', className)}>
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
            </div>

            <div
                className="space-y-3"
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDragging(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(event.dataTransfer.files);
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        addFiles(event.target.files);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                />

                <div
                    className="w-full overflow-hidden rounded-card border-2 border-dashed p-4 transition-colors sm:p-5"
                    style={{
                        borderColor: dragging ? 'var(--border-strong)' : 'var(--border)',
                        background: dragging ? 'color-mix(in oklab, var(--surface) 98%, var(--bg-subtle) 2%)' : 'var(--surface)',
                    }}
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M14 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V8L14 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M14 3V8H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 13H15M9 17H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Agregar documentos</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Archivos de apoyo, legales o comerciales para complementar el aviso.
                            </p>
                            <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {helperText} · {items.length} / {maxItems}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-start sm:ml-auto sm:justify-end">
                            <PanelButton type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                                Seleccionar archivos
                            </PanelButton>
                        </div>
                    </div>
                </div>

                {items.length > 0 ? (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-card border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.name}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{formatPanelMediaBytes(item.sizeBytes)}</p>
                                </div>
                                <PanelButton type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                                    Quitar
                                </PanelButton>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
        </div>
    );
}
