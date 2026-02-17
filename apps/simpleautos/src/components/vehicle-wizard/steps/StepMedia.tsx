"use client";
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { v4 as uuid } from 'uuid';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import { Button, Input } from '@simple/ui';
import { getMaxImagesPerListing } from '@simple/config';
import { fileToDataURL, fileToWebp } from '@/lib/image';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';

const dropZoneBase = "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer card-surface shadow-card hover:border-[var(--color-primary-a50)]";

interface LocalImage {
  id: string;
  file?: File;
  url?: string; // remote
  dataUrl?: string; // preview
  main?: boolean;
}

interface LocalDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  is_public?: boolean;
  record_id?: string;
  file?: File;
  path?: string;
}

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (backend bucket limit)
const ALLOWED_DOCUMENT_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  const shown = idx === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${shown} ${units[idx]}`;
}

function normalizeImages(list: LocalImage[]): LocalImage[] {
  if (!Array.isArray(list) || list.length === 0) return [];
  // Opción 1 UX: el orden define la portada. La primera imagen siempre es la portada.
  return list.map((img, idx) => ({ ...img, main: idx === 0 }));
}

function SortableMediaItem({
  img,
  onRemove,
  onSetMain,
}: {
  img: LocalImage;
  onRemove: (id: string) => void;
  onSetMain: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: img.id,
  });

  const dragProps = { ...attributes, ...listeners };
  const stopDragFromButtons = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <li
      ref={setNodeRef}
      className={`relative group transition-opacity ${img.main ? 'touch-auto' : 'touch-none'} ${isDragging ? 'opacity-90' : 'opacity-100'}`}
      {...dragProps}
    >
      <div
        className="aspect-video rounded-md overflow-hidden shadow-card bg-lightbg dark:bg-darkbg flex items-center justify-center select-none"
      >
        {img.dataUrl ? (
          <img src={img.dataUrl} alt="preview" className="object-cover w-full h-full" draggable={false} />
        ) : img.url ? (
          <img src={img.url} alt="preview" className="object-cover w-full h-full" draggable={false} />
        ) : (
          <span className="text-[10px] text-lighttext/70 dark:text-darktext/70">Procesando...</span>
        )}
      </div>

      <div className="absolute inset-0 bg-[var(--overlay-scrim-0)] md:group-hover:bg-[var(--overlay-scrim-40)] md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto opacity-100 transition rounded-md flex items-end p-2 gap-2">
        <Button
          type="button"
          size="xs"
          shape="pill"
          variant={img.main ? 'primary' : 'neutral'}
          className="px-2 py-1 text-[10px]"
          onPointerDown={stopDragFromButtons}
          onClick={() => onSetMain(img.id)}
        >
          {img.main ? 'Portada' : 'Hacer portada'}
        </Button>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-lighttext/60 dark:text-darktext/60">
          Arrastra para ordenar
        </div>

        <Button
          type="button"
          size="xs"
          shape="pill"
          variant="danger"
          className="ml-auto px-2 py-1 text-[10px]"
          onPointerDown={stopDragFromButtons}
          onClick={() => onRemove(img.id)}
        >
          Eliminar
        </Button>
      </div>

      {img.main && (
        <span className="absolute top-1 left-1 bg-primary text-[var(--color-on-primary)] text-[10px] px-1.5 py-0.5 rounded shadow">
          PORTADA
        </span>
      )}
      <span className="absolute top-1 right-1 md:hidden card-surface text-[10px] px-1.5 py-0.5 rounded shadow-card text-lighttext/70 dark:text-darktext/70">
        Arrastra
      </span>
    </li>
  );
}

const StepMedia: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const router = useRouter();
  const images = state.media.images as LocalImage[];
  const documents = useMemo(() => (state.media.documents || []) as LocalDocument[], [state.media.documents]);
  const videoUrl = state.media.video_url || '';
  const maxImages = getMaxImagesPerListing({ vertical: 'autos', vehicleTypeKey: state.vehicle.type_key });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingImages(true);
    const current = [...images];
    let skipped = 0;
    let processed = 0;
    try {
      for (const file of Array.from(files)) {
        if (current.length >= maxImages) break;
        if (!file.type.startsWith('image/')) continue;

        const id = uuid();
        try {
          // Convertimos siempre a WebP para compatibilidad y peso.
          // Si el navegador no puede decodificar el formato (ej: HEIC en muchos browsers), fallará.
          const webpFile = await fileToWebp(file, 2000, 2000, 0.9);
          const dataUrl = await fileToDataURL(webpFile);
          current.push({ id, file: webpFile, dataUrl, main: current.length === 0 });
          processed += 1;
        } catch {
          skipped += 1;
        }
      }

      const normalized = normalizeImages(current);
      patch('media', { images: normalized });

      if (skipped > 0) {
        setError(`Se omitió(n) ${skipped} archivo(s) porque el formato no es compatible para previsualización/convertir en este navegador.`);
      } else if (processed > 0) {
        setError(null);
      }

      // Permite volver a seleccionar el mismo archivo (onChange no dispara si no cambia el value)
      if (inputRef.current) inputRef.current.value = '';
      // Validación simple: al menos una imagen
      const valid = validateStepData('media', { images: normalized, video_url: videoUrl }).ok;
      patch('validity', { media: valid && !videoError });
    } finally {
      setIsProcessingImages(false);
    }
  }, [images, patch, maxImages, videoUrl, videoError]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFiles(e.dataTransfer.files);
  };
  const handleBrowse = () => inputRef.current?.click();

  const onDocuments = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = [...documents];
    let skipped = 0;
    for (const file of Array.from(files)) {
      const mime = file.type || '';
      if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mime)) {
        skipped += 1;
        continue;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        skipped += 1;
        continue;
      }
      const id = uuid();
      current.push({ id, name: file.name, type: mime, size: file.size, is_public: false, file });
    }

    patch('media', { documents: current });

    if (skipped > 0) {
      setDocError(`Se omitió(n) ${skipped} archivo(s). Solo se aceptan PDF o imágenes (JPG/PNG) de hasta 10MB.`);
    } else {
      setDocError(null);
    }

    if (docInputRef.current) docInputRef.current.value = '';
  }, [documents, patch]);

  const setDocumentPublic = (id: string, isPublic: boolean) => {
    const next = documents.map((d) => (d.id === id ? { ...d, is_public: isPublic } : d));
    patch('media', { documents: next });
  };

  const removeDocument = (id: string) => {
    const next = documents.filter((d) => d.id !== id);
    patch('media', { documents: next });
    if (next.length === 0) setDocError(null);
  };

  const removeImage = (id: string) => {
    const filtered = normalizeImages(images.filter(i => i.id !== id));
    patch('media', { images: filtered });
    if (filtered.length > 0) setError(null);
    const valid = validateStepData('media', { images: filtered, video_url: videoUrl }).ok;
    patch('validity', { media: valid && !videoError });
  };

  const setMain = (id: string) => {
    const idx = images.findIndex((i) => i.id === id);
    if (idx < 0) return;
    if (idx === 0) return;
    const copy = [...images];
    const [item] = copy.splice(idx, 1);
    copy.unshift(item);
    patch('media', { images: normalizeImages(copy) });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeItem = images.find((i) => i.id === activeId);
    const overItem = images.find((i) => i.id === overId);
    if (!activeItem || !overItem) return;

    const from = images.findIndex((i) => i.id === activeId);
    const to = images.findIndex((i) => i.id === overId);
    if (from < 0 || to < 0) return;
    patch('media', { images: normalizeImages(arrayMove(images, from, to)) });
  };

  const setVideoUrl = (val: string) => {
    const next = val.trim();
    patch('media', { video_url: next ? next : undefined });
    if (!next) {
      setVideoError(null);
      const valid = validateStepData('media', { images: normalizeImages(images), video_url: '' }).ok;
      patch('validity', { media: valid });
      return;
    }
    const ok = validateStepData('media', { images: normalizeImages(images), video_url: next }).ok;
    setVideoError(ok ? null : 'Ingresa una URL válida (https://...)');
    patch('validity', { media: images.length > 0 && ok });
  };

  const goForward = () => {
    if (images.length === 0) {
      setError('Agrega al menos una imagen.');
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-media-dropzone]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (videoError) {
      setError('Revisa el enlace de video.');
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-media-video]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setStep('commercial');
  };

  return (
    <WizardStepLayout
      title="Multimedia"
      description="Arrastra imágenes o haz clic para seleccionarlas. La primera será la portada."
      summary={images.length ? `${images.length} foto${images.length === 1 ? '' : 's'} cargada${images.length === 1 ? '' : 's'} · Portada: 1ª${videoUrl ? ' · Video: sí' : ''}` : 'Aún no has agregado fotos (obligatorio para publicar).' }
      footer={(
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('specs')}>Volver</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
          </div>
          <Button
            type="button"
            onClick={goForward}
            disabled={images.length === 0 || isProcessingImages}
            variant="primary"
            size="md"
          >Continuar</Button>
        </div>
      )}
    >
      <ConfirmCancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          router.push('/panel/mis-publicaciones');
        }}
      />
      <div className="flex flex-col gap-6">
        <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => onFiles(e.target.files)}
      />

        <input
          ref={docInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => onDocuments(e.target.files)}
        />

        <div
        onDragOver={e => { e.preventDefault(); }}
        onDrop={handleDrop}
        onClick={handleBrowse}
          data-media-dropzone
        className={dropZoneBase}
      >
        <span className="text-xs text-lighttext/70 dark:text-darktext/70">Suelta aquí o haz clic para subir (max {maxImages})</span>
        <span className="text-[11px] text-lighttext/60 dark:text-darktext/60">Formatos: cualquier imagen (se convertirá a WebP). Si tu navegador no soporta el formato, se omitirá.</span>
        <Button type="button" variant="primary" size="md" onClick={(e) => { e.stopPropagation(); handleBrowse(); }}>
          Seleccionar archivos
        </Button>
        </div>

        {error && <div className="text-[11px] text-[var(--color-danger)]">{error}</div>}

        {/* Imágenes siempre inmediatamente bajo el recuadro de subida */}
        {images.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
              <ul className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img) => (
                  <SortableMediaItem
                    key={img.id}
                    img={img}
                    onRemove={removeImage}
                    onSetMain={setMain}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {/* Video + Documentos siempre abajo, lado a lado */}
        <div className="grid gap-6 md:grid-cols-2 items-start">
          <div data-media-video className="w-full">
            <Input
              type="url"
              label="Video (opcional)"
              value={videoUrl}
              onChange={(e) => setVideoUrl((e.target as HTMLInputElement).value)}
              placeholder="https://www.youtube.com/watch?v=..."
              error={videoError || undefined}
              shape="pill"
              fieldSize="md"
            />
            <div className="mt-1 text-[11px] text-lighttext/60 dark:text-darktext/60">
              Agrega un enlace (YouTube u otro). Si no tienes, puedes dejarlo vacío.
            </div>
          </div>

          <div className="w-full card-surface shadow-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Documentos (opcional)</div>
                <div className="mt-0.5 text-[11px] text-lighttext/60 dark:text-darktext/60">
                  Sube mantenciones, revisiones, papeles u otros respaldos. Acepta PDF o imágenes (JPG/PNG) hasta 10MB.
                </div>
                <div className="mt-1 text-[11px] text-lighttext/60 dark:text-darktext/60">
                  Público: se muestra el nombre en la ficha. Privado: solo tú.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => docInputRef.current?.click()}
              >
                Agregar documentos
              </Button>
            </div>

            {docError && <div className="mt-2 text-[11px] text-[var(--color-danger)]">{docError}</div>}

            {documents.length > 0 && (
              <ul className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--field-bg)] border border-[var(--field-border)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-xs font-medium truncate">{doc.name}</div>
                        {(() => {
                          const type = String(doc.type || '').toLowerCase();
                          const name = String(doc.name || '').toLowerCase();
                          const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
                          const isImage = type.startsWith('image/');
                          const label = isPdf ? 'PDF' : (isImage ? 'Imagen' : null);
                          if (!label) return null;
                          return (
                            <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-lightbg dark:bg-darkbg text-lighttext/70 dark:text-darktext/70">
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-[11px] text-lighttext/60 dark:text-darktext/60">
                        {(() => {
                          const type = String(doc.type || '').toLowerCase();
                          const name = String(doc.name || '').toLowerCase();
                          const isPdf = type === 'application/pdf' || name.endsWith('.pdf');
                          const isImage = type.startsWith('image/');
                          const label = isPdf ? 'PDF' : (isImage ? 'Imagen' : 'Archivo');
                          return `${formatBytes(doc.size)} · ${label}`;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={doc.is_public ? 'subtle' : 'neutral'}
                        size="xs"
                        shape="pill"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setDocumentPublic(doc.id, !doc.is_public)}
                        aria-pressed={!!doc.is_public}
                      >
                        {doc.is_public ? 'Público' : 'Privado'}
                      </Button>
                    <Button type="button" variant="danger" size="xs" shape="pill" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeDocument(doc.id)}>
                      Quitar
                    </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </WizardStepLayout>
  );
};

export default StepMedia;







