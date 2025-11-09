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
    <div className="group relative rounded-2xl border border-gray-200/60 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-gray-300/60 dark:hover:border-gray-600/50">
      {/* Header con usuario y calificación */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {user.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              {user}
            </h4>
            {date && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {date}
              </span>
            )}
          </div>
        </div>

        {/* Calificación con estrellas */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <IconStarFilled
                key={i}
                size={14}
                className={`transition-colors ${
                  i < safeRating
                    ? 'text-amber-400'
                    : 'text-gray-200 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-right">
            {safeRating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Comentario */}
      {comment && (
        <div className="pl-11">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {comment}
          </p>
        </div>
      )}

      {/* Efecto hover sutil */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

export default ReviewItem;
