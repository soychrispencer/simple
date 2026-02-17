"use client";

import React, { useEffect, useState } from "react";
import { Button, Modal, useToast } from "@simple/ui";

export type InstagramPublishModalBaseProps = {
  open: boolean;
  onClose: () => void;

  heading?: string;
  description?: string;

  imageUrl: string;
  alt: string;

  defaultCaption: string;
  filename: string;

  enablePublish?: boolean;
  publishLabel?: string;
  onPublish?: (input: { imageUrl: string; caption: string }) => Promise<any>;

  connectHref?: string;
  connectLabel?: string;
};

export function InstagramPublishModalBase(props: InstagramPublishModalBaseProps) {
  const {
    open,
    onClose,
    heading,
    description,
    imageUrl,
    alt,
    defaultCaption,
    filename,
    enablePublish,
    publishLabel,
    onPublish,
    connectHref,
    connectLabel,
  } = props;
  const { addToast } = useToast();

  const [caption, setCaption] = useState<string>(defaultCaption || "");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCaption(defaultCaption || "");
  }, [open, defaultCaption]);

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      addToast("Descripción copiada", { type: "success" });
    } catch {
      addToast("No se pudo copiar la descripción", { type: "error" });
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename || "instagram.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      addToast("Imagen descargada", { type: "success" });
    } catch (e: any) {
      addToast(`No se pudo descargar la imagen: ${e?.message || "Error"}`, { type: "error" });
    }
  };

  const publishNow = async () => {
    if (!enablePublish || !onPublish) return;
    if (!imageUrl) {
      addToast("No se pudo generar la imagen", { type: "error" });
      return;
    }
    if (!caption.trim()) {
      addToast("Agrega una descripción", { type: "error" });
      return;
    }
    try {
      setPublishing(true);
      const result = await onPublish({ imageUrl, caption });
      const status = String(result?.status || "");
      if (status === "failed") {
        throw new Error(result?.error || "No se pudo publicar en Instagram");
      }
      if (status === "retrying" || result?.queued) {
        addToast("Publicación en cola. Reintentaremos automáticamente.", { type: "success" });
        return;
      }
      const mediaId = result?.mediaId ? String(result.mediaId) : "";
      const permalink = result?.permalink ? String(result.permalink) : "";
      if (mediaId && permalink) {
        addToast(`Publicado en Instagram (ID: ${mediaId})`, { type: "success" });
      } else {
        addToast(mediaId ? `Publicado en Instagram (ID: ${mediaId})` : "Publicado en Instagram", { type: "success" });
      }
    } catch (e: any) {
      addToast(e?.message || "No se pudo publicar en Instagram", { type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  const goConnect = () => {
    if (!connectHref) return;
    window.location.href = connectHref;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-3xl"
      contentClassName="pt-8"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button variant="neutral" size="md" shape="rounded" className="sm:flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" size="md" shape="rounded" className="sm:flex-1" onClick={copyCaption}>
            Copiar descripción
          </Button>
          <Button variant="outline" size="md" shape="rounded" className="sm:flex-1" onClick={downloadImage}>
            Descargar imagen
          </Button>
          {!enablePublish && onPublish && connectHref ? (
            <Button variant="primary" size="md" shape="rounded" className="sm:flex-1" onClick={goConnect}>
              {connectLabel || "Conectar Instagram"}
            </Button>
          ) : null}
          {enablePublish && onPublish ? (
            <Button
              variant="primary"
              size="md"
              shape="rounded"
              className="sm:flex-1"
              onClick={publishNow}
              disabled={publishing}
            >
              {publishing ? "Publicando..." : publishLabel || "Publicar ahora"}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">{heading || "Publicar en Instagram"}</h3>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">
            {description || "Genera una imagen lista para Instagram y un texto sugerido."}
          </p>
        </div>

        {!alt ? (
          <div className="text-sm text-lighttext/70 dark:text-darktext/70">Selecciona una publicación.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-surface rounded-2xl overflow-hidden ring-1 ring-border/60">
              {imageUrl ? (
                <img src={imageUrl} alt={alt} className="w-full h-auto block" />
              ) : (
                <div className="p-6 text-sm text-lighttext/70 dark:text-darktext/70">No se pudo generar la imagen.</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-lighttext dark:text-darktext">Descripción</div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={12}
                className="w-full rounded-2xl card-surface ring-1 ring-border/60 p-3 text-sm text-lighttext dark:text-darktext outline-none focus:ring-2 focus:ring-[var(--color-primary-a30)]"
              />
              <div className="text-xs text-lighttext/60 dark:text-darktext/60">
                Consejo: Instagram funciona mejor con 1 imagen cuadrada (1:1) y un texto breve.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
