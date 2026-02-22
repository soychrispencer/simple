"use client";
import React from "react";
import { Button } from "@simple/ui";
import { fileToDataURL } from "@/lib/media";
import { useWizard, type WizardImage } from "../context/WizardContext";
import { wizardFieldClass, wizardLabelMutedClass } from "../styles";

function StepMedia() {
  const { state, patchSection } = useWizard();
  const images = state.data.media.images;
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const nextImages: WizardImage[] = [];
    for (const file of Array.from(fileList)) {
      const dataUrl = await fileToDataURL(file);
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      nextImages.push({ id, file, dataUrl, main: images.length === 0 && nextImages.length === 0 });
    }
    patchSection("media", { images: [...images, ...nextImages] });
  };

  const handleMain = (id: string) => {
    patchSection("media", {
      images: images.map((img) => ({ ...img, main: img.id === id })),
    });
  };

  const handleRemove = (id: string) => {
    patchSection("media", {
      images: images.filter((img) => img.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl p-6 text-center gap-4">
        <p className="text-sm text-[var(--text-tertiary)]">
          Arrastra tus fotos principales o carga desde tu computador (hasta 20 imágenes)
        </p>
        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
          Seleccionar imágenes
        </Button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <figure key={image.id} className="relative rounded-2xl overflow-hidden card-surface ring-1 ring-border/60">
              <img src={image.dataUrl || image.url || image.remoteUrl || ""} alt="" className="h-48 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[var(--overlay-scrim-70)] px-3 py-2 text-xs text-[var(--color-on-primary)]">
                <button type="button" onClick={() => handleMain(image.id)} className="font-medium">
                  {image.main ? "Imagen principal" : "Hacer principal"}
                </button>
                <button type="button" onClick={() => handleRemove(image.id)} className="text-[var(--color-danger)]">
                  Eliminar
                </button>
              </div>
            </figure>
          ))}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className={wizardLabelMutedClass}>Video (opcional)</span>
          <input
            type="url"
            placeholder="https://..."
            value={state.data.media.video_url ?? ""}
            onChange={(event) => patchSection("media", { video_url: event.target.value || null })}
            className={wizardFieldClass}
          />
        </label>
        <label className="space-y-1">
          <span className={wizardLabelMutedClass}>Tour virtual (opcional)</span>
          <input
            type="url"
            placeholder="https://..."
            value={state.data.media.virtual_tour_url ?? ""}
            onChange={(event) => patchSection("media", { virtual_tour_url: event.target.value || null })}
            className={wizardFieldClass}
          />
        </label>
      </div>
    </div>
  );
}

export default StepMedia;
