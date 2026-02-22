"use client";
import React from "react";
import ProfileCoverCropper from "./ProfileCoverCropper";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useToast } from "../toast/ToastProvider";
import { uploadPortada, deletePortada, getPortadaUrl } from "../../../lib/storage";
import { useAuth } from "@simple/auth";

function resolveCoverUrl(path?: string | null): string | null {
  const raw = String(path || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return getPortadaUrl(null, raw);
}

export default function ProfileCoverUploader({
  cropOpen,
  setCropOpen,
}: {
  cropOpen?: boolean;
  setCropOpen?: (open: boolean) => void;
}) {
  const { addToast } = useToast();
  const { user, refresh } = useAuth();
  const [cover, setCover] = React.useState<{ url: string; blob: Blob | null } | null>(null);
  const [internalCropOpen, internalSetCropOpen] = React.useState(false);
  const isControlled = typeof cropOpen === "boolean" && typeof setCropOpen === "function";
  const open = isControlled ? cropOpen : internalCropOpen;
  const setOpen = isControlled ? setCropOpen! : internalSetCropOpen;
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function loadCover() {
      const direct = resolveCoverUrl((user as any)?.cover_url);
      if (direct) {
        if (active) setCover({ url: direct, blob: null });
        return;
      }

      try {
        const response = await fetch("/api/public-profile", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        const path = String(((payload as any)?.profile?.cover_url || ""));
        const resolved = resolveCoverUrl(path);
        if (resolved && active) setCover({ url: resolved, blob: null });
      } catch {
        // silent
      }
    }
    void loadCover();
    return () => {
      active = false;
    };
  }, [user]);

  const openFor = (file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setOpen(true);
  };

  const handleFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (f) openFor(f);
  };

  const onCropped = async (blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    if (cover?.url && !cover.url.startsWith("http")) URL.revokeObjectURL(cover.url);
    setCover({ url: previewUrl, blob });

    try {
      const userId = String((user as any)?.id || "").trim();
      if (!userId) throw new Error("No autenticado");

      let previousPath = "";
      try {
        const current = await fetch("/api/public-profile", { method: "GET", cache: "no-store" });
        const currentPayload = await current.json().catch(() => ({} as Record<string, unknown>));
        previousPath = String(((currentPayload as any)?.profile?.cover_url || ""));
      } catch {
        previousPath = "";
      }

      const file = new File([blob], `portada-${userId}.webp`, { type: "image/webp" });
      const path = await uploadPortada(null, file, userId);
      if (!path) throw new Error("No se pudo subir la portada");

      const persist = await fetch("/api/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_public",
          cover_url: path,
        }),
      });
      if (!persist.ok) throw new Error("No se pudo guardar la portada");

      if (previousPath && previousPath !== path) {
        await deletePortada(null, previousPath);
      }

      const resolved = resolveCoverUrl(path);
      if (resolved) setCover({ url: resolved, blob: null });
      if (typeof refresh === "function") {
        await refresh(true);
      }
      addToast("Portada actualizada", { type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar portada";
      addToast(msg, { type: "error" });
    }
  };

  const handleDelete = async () => {
    const currentPath =
      cover?.url && !cover.url.startsWith("http") ? cover.url.replace(/^\/+/, "") : String((user as any)?.cover_url || "");

    if (cover?.url && !cover.url.startsWith("http")) URL.revokeObjectURL(cover.url);
    setCover(null);
    setSrc(null);

    try {
      const persist = await fetch("/api/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_public",
          cover_url: null,
        }),
      });
      if (!persist.ok) throw new Error("No se pudo eliminar la portada");

      if (currentPath) {
        await deletePortada(null, currentPath);
      }
      if (typeof refresh === "function") {
        await refresh(true);
      }
      addToast("Eliminada con éxito", { type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo eliminar";
      addToast(msg, { type: "error" });
    }
  };

  return (
    <div className="absolute left-0 top-0 w-full z-10 flex flex-col items-center">
      <div className="w-full aspect-[32/10] md:aspect-[32/9] bg-[var(--field-bg)] overflow-hidden border border-[var(--field-border)] group relative rounded-[var(--card-radius)]">
        {cover?.url ? (
          <img src={cover.url} alt="portada" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lg text-lighttext dark:text-darktext">Sin portada</span>
          </div>
        )}
      </div>

      <label className="absolute bottom-3 right-3 card-surface card-surface-raised bg-[var(--field-bg)] hover:bg-[var(--field-bg-hover)] text-[var(--field-text)] rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-150 pointer-events-auto z-30">
        <input id="cover-file-inline" type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <IconPlus size={16} className="text-[var(--field-text)]" />
      </label>

      {cover ? (
        <button
          type="button"
          className="absolute top-3 right-3 bg-[var(--color-danger)] hover:opacity-95 active:opacity-90 text-[var(--color-on-primary)] rounded-full w-7 h-7 flex items-center justify-center shadow-md transition-opacity duration-150 pointer-events-auto z-30"
          onClick={handleDelete}
          aria-label="Eliminar portada"
        >
          <IconX size={13} />
        </button>
      ) : null}

      <ProfileCoverCropper open={open} onClose={() => setOpen(false)} imageSrc={src} onCropped={onCropped} />
    </div>
  );
}

