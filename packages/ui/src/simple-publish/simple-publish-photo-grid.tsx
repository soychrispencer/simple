'use client';

import { useRef, useState } from 'react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconPhoto, IconPlus, IconStar, IconX } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';
import { MediaSourcePicker, usePrefersCameraSource } from './media-source-picker';
import { MediaSourceSheet } from './media-source-sheet';

export type SimplePublishPhoto = {
    id: string;
    previewUrl: string;
    isCover?: boolean;
};

export type SimplePublishPhotoGridProps = {
    photos: SimplePublishPhoto[];
    maxPhotos?: number;
    recommendedPhotos?: number;
    error?: string;
    invalid?: boolean;
    /** Bloquea agregar/reordenar mientras se optimizan fotos. */
    disabled?: boolean;
    onAddFiles: (files: FileList) => void;
    onRemovePhoto: (id: string) => void;
    onReorderPhotos: (photos: SimplePublishPhoto[]) => void;
};

function hasPhotoPreview(url: string | undefined | null): url is string {
    return Boolean(url?.trim());
}

function SortableTile({
    photo,
    index,
    onRemove,
}: {
    photo: SimplePublishPhoto;
    index: number;
    onRemove: (id: string) => void;
}) {
    const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
        id: photo.id,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
                touchAction: 'none',
            }}
            className={joinClasses(
                'group relative aspect-square cursor-grab overflow-hidden rounded-2xl border-2 transition-all active:cursor-grabbing',
                index === 0 ? 'border-(--accent) shadow-md' : 'border-(--border)',
                isDragging ? 'z-50 opacity-30 shadow-none' : '',
            )}
            {...attributes}
            {...listeners}
        >
            {hasPhotoPreview(photo.previewUrl) ? (
                <img src={photo.previewUrl} alt="" className="pointer-events-none h-full w-full object-cover" />
            ) : (
                <div
                    className="pointer-events-none flex h-full w-full items-center justify-center bg-(--bg-muted)"
                    aria-hidden
                >
                    <IconPhoto size={22} className="text-(--fg-muted)" />
                </div>
            )}
            {index === 0 ? (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-(--accent) px-2 py-0.5 text-[10px] font-bold text-(--accent-contrast)">
                    <IconStar size={8} fill="currentColor" />
                    Portada
                </div>
            ) : null}
            <div className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white">
                {index + 1}
            </div>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove(photo.id);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-sm opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                aria-label="Quitar foto"
            >
                <IconX size={14} />
            </button>
            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/20 opacity-0 transition-opacity [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:opacity-100">
                <IconGripVertical size={18} className="text-white" />
            </div>
        </div>
    );
}

export function SimplePublishPhotoGrid({
    photos,
    maxPhotos = 20,
    recommendedPhotos = 8,
    error,
    invalid = false,
    disabled = false,
    onAddFiles,
    onRemovePhoto,
    onReorderPhotos,
}: SimplePublishPhotoGridProps) {
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const prefersCamera = usePrefersCameraSource();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const missingRecommended = Math.max(recommendedPhotos - photos.length, 0);
    const progressPercent = Math.min((photos.length / recommendedPhotos) * 100, 100);
    const canAddMore = !disabled && photos.length < maxPhotos;

    const handleDragEnd = (event: DragEndEvent) => {
        if (disabled) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = photos.findIndex((photo) => photo.id === active.id);
        const newIndex = photos.findIndex((photo) => photo.id === over.id);
        onReorderPhotos(arrayMove(photos, oldIndex, newIndex));
    };

    const openGallery = () => {
        if (disabled) return;
        galleryInputRef.current?.click();
        setSourceOpen(false);
    };

    const openCamera = () => {
        if (disabled) return;
        cameraInputRef.current?.click();
        setSourceOpen(false);
    };

    const handleAddMore = () => {
        if (disabled) return;
        if (!prefersCamera) {
            openGallery();
            return;
        }
        setSourceOpen(true);
    };

    const handleFiles = (files: FileList | null) => {
        if (disabled) return;
        if (files?.length) onAddFiles(files);
    };

    return (
        <div className={joinClasses('space-y-3', disabled && 'pointer-events-none opacity-60')}>
            {photos.length === 0 ? (
                <div
                    onDragOver={(event) => {
                        if (disabled) return;
                        event.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                        if (disabled) return;
                        event.preventDefault();
                        setDragOver(false);
                        onAddFiles(event.dataTransfer.files);
                    }}
                    className={joinClasses(
                        'rounded-2xl transition-colors',
                        dragOver && 'ring-2 ring-(--accent) ring-offset-2 ring-offset-(--surface)',
                    )}
                >
                    <MediaSourcePicker
                        size="empty"
                        invalid={invalid}
                        onCamera={openCamera}
                        onGallery={openGallery}
                        desktopLabel="Subir fotos"
                    />
                    <p className="mt-2 text-center text-[11px] text-(--fg-muted)">Hasta {maxPhotos} fotos</p>
                </div>
            ) : (
                <>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {photos.map((photo, index) => (
                                    <SortableTile
                                        key={photo.id}
                                        photo={photo}
                                        index={index}
                                        onRemove={onRemovePhoto}
                                    />
                                ))}
                                {canAddMore ? (
                                    <button
                                        type="button"
                                        onClick={handleAddMore}
                                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-(--border) text-(--accent) transition-colors hover:border-(--accent) hover:bg-(--accent-subtle)/20"
                                        aria-label="Agregar fotos"
                                    >
                                        <IconPlus size={22} />
                                        <span className="text-[10px] font-medium">Agregar</span>
                                    </button>
                                ) : null}
                            </div>
                        </SortableContext>
                    </DndContext>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-(--fg-muted)">
                            <span>
                                {missingRecommended > 0
                                    ? `${photos.length} de ${recommendedPhotos} recomendadas`
                                    : `${photos.length} fotos`}
                            </span>
                            <span>Portada primero</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-(--bg-muted)">
                            <div
                                className="h-full rounded-full bg-(--accent) transition-[width] duration-200"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </>
            )}

            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                }}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                }}
            />

            <MediaSourceSheet
                open={sourceOpen}
                title="Agregar fotos"
                onClose={() => setSourceOpen(false)}
                onCamera={openCamera}
                onGallery={openGallery}
                desktopLabel="Subir fotos"
            />

            {error?.trim() ? <p className="text-xs text-(--color-error)" data-publish-error="true">{error}</p> : null}
        </div>
    );
}
