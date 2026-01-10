"use client";
import React from 'react';
import { IconStarFilled } from '@tabler/icons-react';

interface ReviewItemProps {
  user: string;
  rating: number; // 1-5
  comment: string;
  date?: string;
}

export function ReviewItem({ user, rating, comment, date }: ReviewItemProps) {
  const safeRating = Math.min(5, Math.max(0, rating));

  return (
    <div className="group relative rounded-2xl card-surface shadow-card backdrop-blur-sm p-5 hover:shadow-card transition-all duration-300">
      {/* Header con usuario y calificaci�n */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--field-bg)] flex items-center justify-center ring-1 ring-border/60">
            <span className="text-primary font-semibold text-sm">
              {user.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-lighttext dark:text-darktext text-sm">
              {user}
            </h4>
            {date && (
              <span className="text-xs text-lighttext/70 dark:text-darktext/70">
                {date}
              </span>
            )}
          </div>
        </div>

        {/* Calificaci�n con estrellas */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <IconStarFilled
                key={i}
                size={14}
                className={`transition-colors ${
                  i < safeRating
                    ? 'text-[var(--color-warn)]'
                    : 'text-lighttext/30 dark:text-darktext/40'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-lighttext dark:text-darktext min-w-[2rem] text-right">
            {safeRating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Comentario */}
      {comment && (
        <div className="pl-11">
          <p className="text-sm leading-relaxed text-lighttext dark:text-darktext whitespace-pre-wrap break-words">
            {comment}
          </p>
        </div>
      )}

      {/* Efecto hover sutil */}
      <div className="absolute inset-0 rounded-2xl bg-[var(--overlay-highlight-4)] dark:bg-[var(--overlay-scrim-6)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

export default ReviewItem;







