import React from 'react';
import { RatingChip } from '@simple/ui';
import { ReviewItem } from '@/components/perfil/ReviewItem';
import { IconMessageCircle } from '@tabler/icons-react';

interface PublicReviewsProps {
  puntuacion?: number;
  reseñas?: Array<{ usuario: string; calificacion: number; comentario: string; fecha: string }>;
}

const PublicReviews: React.FC<PublicReviewsProps> = ({ puntuacion = 0, reseñas = [] }) => {
  const average = reseñas.length > 0 ? (puntuacion / reseñas.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between p-4 card-inset radius-md">
        <div className="flex items-center gap-4">
          <RatingChip value={puntuacion} total={reseñas.length} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-lighttext/80 dark:text-darktext/80">
              {reseñas.length} opinión{reseñas.length !== 1 ? 'es' : ''}
            </span>
            <span className="text-xs text-lighttext/70 dark:text-darktext/70">
              Promedio de calificaciones
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < Math.round(average)
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-border/60 dark:bg-border/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lista de reseñas */}
      <div className="space-y-4">
        {reseñas.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full card-inset flex items-center justify-center">
              <IconMessageCircle size={28} className="text-lighttext/50 dark:text-darktext/50" />
            </div>
            <h3 className="text-lg font-medium text-lighttext dark:text-darktext mb-2">
              Aún no hay opiniones
            </h3>
            <p className="text-lighttext/70 dark:text-darktext/70 text-sm">
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







