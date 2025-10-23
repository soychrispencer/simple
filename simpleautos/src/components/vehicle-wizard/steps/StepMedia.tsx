"use client";
import React, { useCallback, useRef, useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { v4 as uuid } from 'uuid';

const dropZoneBase = "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer bg-lightcard dark:bg-darkcard border-lightborder/30 dark:border-darkborder/20 hover:border-primary/70";

interface LocalImage {
  id: string;
  file?: File;
  url?: string; // remote
  dataUrl?: string; // preview
  main?: boolean;
}

const MAX_IMAGES = 12;

const StepMedia: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const images = state.media.images as LocalImage[];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const current = [...images];
    for (const file of Array.from(files)) {
      if (current.length >= MAX_IMAGES) break;
      if (!file.type.startsWith('image/')) continue;
      const id = uuid();
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(reader.error);
        reader.readAsDataURL(file);
      });
      current.push({ id, file, dataUrl, main: current.length === 0 });
    }
    patch('media', { images: current });
    // Validación simple: al menos una imagen
    const valid = validateStepData('media', { images: current }).ok || current.length > 0;
    patch('validity', { media: valid });
  }, [images, patch]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFiles(e.dataTransfer.files);
  };
  const handleBrowse = () => inputRef.current?.click();

  const removeImage = (id: string) => {
    const filtered = images.filter(i => i.id !== id);
    // Reasignar main si necesario
    if (!filtered.some(i => i.main) && filtered.length > 0) {
      filtered[0].main = true;
    }
    patch('media', { images: filtered });
    patch('validity', { media: filtered.length > 0 });
  };

  const setMain = (id: string) => {
    const mapped = images.map(i => ({ ...i, main: i.id === id }));
    const mainIdx = mapped.findIndex(i => i.id === id);
    if (mainIdx > 0) {
      const reordered = [...mapped];
      const [mainImg] = reordered.splice(mainIdx, 1);
      reordered.unshift(mainImg);
      patch('media', { images: reordered });
    } else {
      patch('media', { images: mapped });
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = images.findIndex(i => i.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    patch('media', { images: copy });
  };

  const goForward = () => {
    if (images.length === 0) { setError('Agrega al menos una imagen.'); return; }
    setStep('commercial');
  };

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Multimedia</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl">Arrastra imágenes o haz clic para seleccionarlas. La primera será la portada.</p>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => onFiles(e.target.files)}
      />

      <div
        onDragOver={e => { e.preventDefault(); }}
        onDrop={handleDrop}
        onClick={handleBrowse}
        className={dropZoneBase}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Suelta aquí o haz clic para subir (max {MAX_IMAGES})</span>
        <span className="text-[11px] text-gray-400">Formatos: JPG, PNG, WebP</span>
      </div>
      {error && <div className="text-[11px] text-red-500">{error}</div>}

      {images.length > 0 && (
        <ul className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, i) => (
            <li key={img.id} className="relative group">
              <div className="aspect-video rounded-md overflow-hidden ring-1 ring-black/5 dark:ring-white/10 bg-lightbg dark:bg-[#1c1c1c] flex items-center justify-center">
                {img.dataUrl ? (
                  <img src={img.dataUrl} alt="preview" className="object-cover w-full h-full" />
                ) : img.url ? (
                  <img src={img.url} alt="preview" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-[10px] text-gray-500">Procesando...</span>
                )}
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1 transition bg-black/40">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-medium text-red-600 hover:bg-white">
                    Eliminar
                  </button>
                </div>
                <div className="flex justify-between items-end gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(img.id, -1)}
                      disabled={i === 0}
                      className="px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-medium disabled:opacity-40 hover:bg-white"
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => move(img.id, 1)}
                      disabled={i === images.length - 1}
                      className="px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-medium disabled:opacity-40 hover:bg-white"
                    >↓</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMain(img.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${img.main ? 'bg-primary text-white' : 'bg-white/90 text-gray-700 hover:bg-white'}`}
                  >{img.main ? 'Portada' : 'Hacer portada'}</button>
                </div>
              </div>
              {img.main && <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded shadow">PORTADA</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-lightborder/10 dark:border-darkborder/10">
        <button
          type="button"
          onClick={() => setStep('specs')}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
        >Volver</button>
        <button
          type="button"
          onClick={goForward}
          disabled={images.length === 0}
          className="h-10 px-6 rounded-full text-sm font-semibold shadow-card disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-white hover:shadow-card-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
        >Continuar</button>
      </div>
    </div>
  );
};

export default StepMedia;
