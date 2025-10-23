import React from 'react';
import { RatingChip } from '@/components/ui/Chip';
import { ReviewItem } from '@/components/perfil/ReviewItem';

interface PublicReviewsProps {
  puntuacion?: number;
  reseñas?: Array<{ usuario: string; calificacion: number; comentario: string; fecha: string }>;
}

const PublicReviews: React.FC<PublicReviewsProps> = ({ puntuacion = 0, reseñas = [] }) => {
  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center gap-4">
          <RatingChip value={puntuacion} total={reseñas.length} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {reseñas.length} opinión{reseñas.length !== 1 ? 'es' : ''}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Promedio de calificaciones
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < Math.round(puntuacion)
                  ? 'bg-amber-400'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lista de reseñas */}
      <div className="space-y-4">
        {reseñas.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-2xl text-gray-400">💭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aún no hay opiniones
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Sé el primero en compartir tu experiencia
            </p>
          </div>
        ) : (
          reseñas.map((c, idx) => (
            <ReviewItem
              key={idx}
              user={c.usuario}
              rating={c.calificacion}
              comment={c.comentario}
              date={c.fecha}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PublicReviews;
