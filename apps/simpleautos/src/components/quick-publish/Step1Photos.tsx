'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconCamera,
    IconCar,
    IconEngine,
    IconGauge,
    IconPhoto,
    IconPlus,
    IconStar,
    IconUpload,
    IconX,
    IconZoomScan,
    IconArmchair,
    IconSteeringWheel,
} from '@tabler/icons-react';
import { PanelButton } from '@simple/ui';
import type { QuickPhoto } from './types';

// ─── Guide slot definitions ───────────────────────────────────────────────────

const GUIDE_SLOTS = [
    { key: 'cover',    label: 'Portada',     Icon: IconCamera },
    { key: 'front',    label: 'Frente',      Icon: IconCar },
    { key: 'rear',     label: 'Trasera',     Icon: IconCar },
    { key: 'left',     label: 'Izquierdo',   Icon: IconCar },
    { key: 'right',    label: 'Derecho',     Icon: IconCar },
    { key: 'interior', label: 'Interior',    Icon: IconSteeringWheel },
    { key: 'seats',    label: 'Asientos',    Icon: IconArmchair },
    { key: 'engine',   label: 'Motor',       Icon: IconEngine },
    { key: 'detail',   label: 'Detalles',    Icon: IconZoomScan },
    { key: 'km',       label: 'Kilometraje', Icon: IconGauge },
];

// ─── Sortable photo card ──────────────────────────────────────────────────────

function SortablePhoto({
    photo,
    index,
    onRemove,
}: {
    photo: QuickPhoto;
    index: number;
    onRemove: (id: string) => void;
}) {
    const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
        id: photo.id,
    });

    return (
        <div
            ref={setNodeRef}
            data-photo-id={photo.id}
            style={{
                transform: CSS.Transform.toString(transform),
                transition: transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
                touchAction: 'none',
            }}
            className={`relative aspect-square rounded-2xl overflow-hidden group transition-shadow ${
                isDragging ? 'opacity-30 shadow-none' : 'shadow-sm hover:shadow-md'
            }`}
            {...attributes}
            {...listeners}
        >
            {photo.previewUrl || photo.dataUrl ? (
                <Image
                    src={photo.previewUrl || photo.dataUrl}
                    alt=""
                    fill
                    className="object-cover pointer-events-none"
                    unoptimized
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>placeholder</span>
                </div>
            )}

            {/* Cover badge */}
            {index === 0 && (
                <div
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold pointer-events-none"
                    style={{ background: '#FF3600', color: 'white' }}
                >
                    <IconStar size={8} fill="white" />
                    Portada
                </div>
            )}

            {/* Drag handle hint on hover */}
            <div
                className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none [@media(hover:none)]:hidden"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }}
            >
                <span className="text-[10px] font-medium text-white/90">⠿ mover</span>
            </div>

            {/* Remove button — always visible on touch, hover-only on desktop */}
            <button
                type="button"
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-opacity opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'white' }}
                onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <IconX size={11} />
            </button>
        </div>
    );
}

// ─── Empty guide slot ─────────────────────────────────────────────────────────

function GuideSlot({
    slot,
    onClick,
}: {
    slot: (typeof GUIDE_SLOTS)[number];
    onClick: () => void;
}) {
    const { Icon } = slot;
    return (
        <button
            type="button"
            onClick={onClick}
            className="relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:border-[#FF3600] hover:bg-[#fff8f5] active:scale-95"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
        >
            <Icon size={18} style={{ color: 'var(--fg-muted)' }} strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-none" style={{ color: 'var(--fg-muted)' }}>
                {slot.label}
            </span>
        </button>
    );
}

// ─── Add more slot ────────────────────────────────────────────────────────────

function AddSlot({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all hover:border-[#FF3600] hover:bg-[#fff8f5] active:scale-95"
            style={{ borderColor: 'var(--border)' }}
        >
            <IconPlus size={20} style={{ color: 'var(--fg-muted)' }} />
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
    photos: QuickPhoto[];
    onAddPhotos: (files: FileList | File[]) => Promise<boolean | undefined>;
    onRemovePhoto: (id: string) => void;
    onReorderPhotos: (activeId: string, overId: string) => void;
    onNext?: () => void;
    restoredPhotoCount?: number;
    isExtended?: boolean;
}

export default function Step1Photos({
    photos,
    onAddPhotos,
    onRemovePhoto,
    onReorderPhotos,
    onNext,
    restoredPhotoCount = 0,
    isExtended = false,
}: Props) {
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);
    const [processing, setProcessing] = useState(false);
    const [limitToast, setLimitToast] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragSize, setDragSize] = useState(0);

    useEffect(() => {
        setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    }, []);

    // DnD sensors: pointer (mouse) + touch (hold 300ms) + keyboard
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    async function handleFiles(files: FileList | File[] | null) {
        if (!files || files.length === 0) return;
        setProcessing(true);
        const exceeded = await onAddPhotos(files);
        setProcessing(false);
        if (exceeded) {
            setLimitToast(true);
            setTimeout(() => setLimitToast(false), 3000);
        }
    }

    function handleFileDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDraggingFile(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length) void handleFiles(files);
    }

    function handleDragStart({ active }: DragStartEvent) {
        setActiveId(active.id as string);
        const el = document.querySelector(`[data-photo-id="${active.id}"]`) as HTMLElement | null;
        if (el) setDragSize(el.offsetWidth);
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        setActiveId(null);
        if (over && active.id !== over.id) {
            onReorderPhotos(active.id as string, over.id as string);
        }
    }

    const hasPhotos = photos.length > 0;
    const canAdd = photos.length < 20 && !processing;
    const activePhoto = photos.find((p) => p.id === activeId);

    // Build the grid items: photos first, then remaining guide slots, then add button
    const filledCount = photos.length;
    const guideSlots = GUIDE_SLOTS.slice(filledCount);
    const showAddSlot = canAdd && filledCount >= GUIDE_SLOTS.length;

    return (
        <div className="flex flex-col gap-5">
            {/* Restored photos notice */}
            {restoredPhotoCount > 0 && photos.length === 0 && (
                <div
                    className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                >
                    <IconPhoto size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--fg-muted)' }} />
                    <span style={{ color: 'var(--fg-secondary)' }}>
                        Tu sesión anterior tenía {restoredPhotoCount} foto{restoredPhotoCount !== 1 ? 's' : ''}.
                        Por seguridad, las fotos no se guardan entre sesiones — vuelve a subirlas.
                    </span>
                </div>
            )}

            {/* Limit toast */}
            {limitToast && (
                <div
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-xl"
                    style={{ background: '#FF3600' }}
                >
                    Máximo 20 fotos
                </div>
            )}

            {/* Hidden inputs */}
            {isTouchDevice && (
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                    className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
            )}
            <input ref={galleryRef} type="file" accept="image/*" multiple
                className="hidden" onChange={(e) => void handleFiles(e.target.files)} />

            {/* ── Upload area ── */}
            {isTouchDevice ? (
                /* Mobile: 2-button row */
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => cameraRef.current?.click()} disabled={!canAdd}
                        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 border-2 font-semibold text-sm transition-all active:scale-95"
                        style={{ background: '#FF3600', borderColor: '#FF3600', color: 'white', opacity: canAdd ? 1 : 0.4 }}>
                        <IconCamera size={18} />
                        Cámara
                    </button>
                    <button type="button" onClick={() => galleryRef.current?.click()} disabled={!canAdd}
                        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 border-2 font-semibold text-sm transition-all active:scale-95"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg)', opacity: canAdd ? 1 : 0.4 }}>
                        <IconPhoto size={18} style={{ color: 'var(--fg-muted)' }} />
                        Galería
                    </button>
                </div>
            ) : (
                /* Desktop: drag-and-drop zone */
                <div
                    onClick={() => canAdd && galleryRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); if (canAdd) setIsDraggingFile(true); }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleFileDrop}
                    className="flex items-center justify-center gap-4 rounded-2xl border-2 border-dashed transition-all"
                    style={{
                        borderColor: isDraggingFile ? '#FF3600' : 'var(--border)',
                        background: isDraggingFile ? '#fff2ee' : 'var(--bg-subtle)',
                        cursor: canAdd ? 'pointer' : 'default',
                        opacity: canAdd ? 1 : 0.4,
                        padding: hasPhotos ? '14px 20px' : '36px 24px',
                        flexDirection: hasPhotos ? 'row' : 'column',
                    }}
                >
                    <div
                        className="flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
                        style={{
                            background: isDraggingFile ? '#FF3600' : 'var(--bg-muted)',
                            color: isDraggingFile ? 'white' : 'var(--fg-muted)',
                            padding: hasPhotos ? '8px' : '14px',
                        }}
                    >
                        <IconUpload size={hasPhotos ? 18 : 26} />
                    </div>
                    <div className={hasPhotos ? '' : 'text-center'}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                            {isDraggingFile ? 'Suelta aquí' : hasPhotos ? 'Agregar más fotos' : 'Arrastra tus fotos aquí'}
                        </p>
                        {!hasPhotos && (
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                o haz clic para seleccionar · JPG, PNG, WebP
                            </p>
                        )}
                    </div>
                    {!hasPhotos && (
                        <span
                            className="mt-2 rounded-xl px-4 py-2 text-sm font-medium pointer-events-none"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                        >
                            Seleccionar fotos
                        </span>
                    )}
                </div>
            )}

            {/* Processing indicator */}
            {processing && (
                <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-sm">Procesando…</span>
                </div>
            )}

            {/* ── Photo grid with DnD ── */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
            >
                <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {/* Filled photo slots */}
                        {photos.map((photo, index) => (
                            <SortablePhoto
                                key={photo.id}
                                photo={photo}
                                index={index}
                                onRemove={onRemovePhoto}
                            />
                        ))}

                        {/* Empty guide slots */}
                        {guideSlots.map((slot) => (
                            <GuideSlot
                                key={slot.key}
                                slot={slot}
                                onClick={() => galleryRef.current?.click()}
                            />
                        ))}

                        {/* Add more (after all guide slots filled) */}
                        {showAddSlot && (
                            <AddSlot onClick={() => galleryRef.current?.click()} />
                        )}
                    </div>
                </SortableContext>

                {/* Drag overlay — matches the actual cell size, no scale animation */}
                <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
                    {activePhoto && dragSize > 0 && (
                        <div
                            style={{
                                width: dragSize,
                                height: dragSize,
                                transform: 'rotate(2deg) scale(1.04)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                borderRadius: 16,
                                overflow: 'hidden',
                                opacity: 0.97,
                            }}
                        >
                            <Image
                                src={activePhoto.previewUrl}
                                alt=""
                                width={dragSize}
                                height={dragSize}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Helper text */}
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                <span>{hasPhotos ? `${photos.length} foto${photos.length !== 1 ? 's' : ''} · ${isTouchDevice ? 'mantén pulsado para ordenar' : 'arrastra para ordenar'}` : 'Mínimo 1 foto para continuar'}</span>
                <span>máx. 20</span>
            </div>

            {/* Continue */}
            {!isExtended && onNext && (
                <div className="flex flex-col items-end gap-1.5">
                    {!hasPhotos && (
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Sube al menos una foto para continuar</p>
                    )}
                    <PanelButton
                        type="button"
                        variant="primary"
                        onClick={onNext}
                        disabled={!hasPhotos}
                        className="w-full md:w-auto"
                    >
                        Continuar →
                    </PanelButton>
                </div>
            )}
        </div>
    );
}
