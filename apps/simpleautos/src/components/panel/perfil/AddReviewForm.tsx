import React, { useState } from "react";
import { Button, Textarea } from "@simple/ui";
import { IconCheck, IconStar, IconStarFilled } from "@tabler/icons-react";

const AddReviewForm: React.FC<{ profileId?: string; onSubmit?: (data: { calificacion: number; comentario: string }) => void }> = ({ profileId, onSubmit }) => {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!calificacion) return;
    setEnviando(true);
    try {
      // Sanitizar comentario antes de guardar
      let DOMPurify: any = null;
      try {
        DOMPurify = require('isomorphic-dompurify');
      } catch {}
      const sanitizedComentario = DOMPurify ? DOMPurify.sanitize(comentario) : comentario;
      const response = await fetch("/api/public-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_review",
          profileId,
          rating: calificacion,
          comment: sanitizedComentario
        })
      });
      if (!response.ok) {
        throw new Error("No se pudo enviar la opinión");
      }

      setSuccess(true);
      setComentario("");
      setCalificacion(0);
      if (onSubmit) onSubmit({ calificacion, comentario });
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Sección de calificación */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-lighttext dark:text-darktext">Tu calificación</span>
            <span className="text-xs text-lighttext/70 dark:text-darktext/70">(requerida)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`w-10 h-10 radius-md flex items-center justify-center transition-colors focus-ring border ${
                    calificacion >= star
                      ? 'bg-[var(--color-primary-a10)] border-[var(--color-primary-a30)] text-primary'
                      : 'bg-[var(--field-bg)] border-[var(--field-border)] text-lighttext/60 dark:text-darktext/60 hover:bg-[var(--field-bg-hover)]'
                  }`}
                  onClick={() => setCalificacion(star)}
                  aria-label={`Calificar ${star} estrella${star !== 1 ? 's' : ''}`}
                >
                  {calificacion >= star ? (
                    <IconStarFilled size={18} className="text-current" />
                  ) : (
                    <IconStar size={18} className="text-current" />
                  )}
                </button>
              ))}
            </div>
            {calificacion > 0 && (
              <span className="text-sm text-lighttext/70 dark:text-darktext/70 ml-2">
                {calificacion} estrella{calificacion !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Sección de comentario */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-lighttext dark:text-darktext">Comentario</span>
            <span className="text-xs text-lighttext/70 dark:text-darktext/70">(opcional)</span>
          </div>
          <Textarea
            label=""
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comparte tu experiencia con esta empresa o servicio..."
            className="resize-none"
            rows={4}
            disabled={!calificacion || enviando}
            shape="rounded"
          />
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">
            Tu opinión ayudará a otros usuarios a tomar mejores decisiones
          </p>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-success-subtle-bg)] ring-1 ring-[var(--color-success-subtle-border)]">
            <div className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center flex-shrink-0">
              <IconCheck size={14} className="text-[var(--color-on-primary)]" />
            </div>
            <span className="text-sm text-[var(--color-success)] font-medium">
              ¡Opinión enviada exitosamente!
            </span>
          </div>
        )}

        {/* Botón de envío */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="px-8 py-2.5 font-medium"
            disabled={!calificacion || enviando}
          >
            {enviando ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[var(--color-on-primary)]/30 border-t-[var(--color-on-primary)] rounded-full animate-spin"></div>
                Enviando...
              </div>
            ) : (
              'Enviar opinión'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddReviewForm;







