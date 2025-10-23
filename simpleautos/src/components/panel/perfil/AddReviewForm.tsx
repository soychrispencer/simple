import React, { useState } from "react";
import { useSupabase } from "@/lib/supabase/useSupabase";
import Button from "../../ui/Button";
import TextArea from "../../ui/form/TextArea";

const AddReviewForm: React.FC<{ profileId?: string; onSubmit?: (data: { calificacion: number; comentario: string }) => void }> = ({ profileId, onSubmit }) => {
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = useSupabase();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!calificacion) return;
    setEnviando(true);
    // Sanitizar comentario antes de guardar
    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch (e) {}
    const sanitizedComentario = DOMPurify ? DOMPurify.sanitize(comentario) : comentario;
    // Guardar reseña en Supabase
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('reviews').insert({
      profile_id: profileId,
      user_id: user?.id,
      rating: calificacion,
      comment: sanitizedComentario
    });
    setEnviando(false);
    setSuccess(true);
    setComentario("");
    setCalificacion(0);
    if (onSubmit) onSubmit({ calificacion, comentario });
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Sección de calificación */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tu calificación</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">(requerida)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-ring ${
                    calificacion >= star
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 scale-110'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                  }`}
                  onClick={() => setCalificacion(star)}
                  aria-label={`Calificar ${star} estrella${star !== 1 ? 's' : ''}`}
                >
                  <span className="text-lg">★</span>
                </button>
              ))}
            </div>
            {calificacion > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                {calificacion} estrella{calificacion !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Sección de comentario */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Comentario</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">(opcional)</span>
          </div>
          <TextArea
            label=""
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comparte tu experiencia con esta empresa o servicio..."
            className="resize-none"
            rows={4}
            disabled={!calificacion || enviando}
            shape="rounded"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tu opinión ayudará a otros usuarios a tomar mejores decisiones
          </p>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
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
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
