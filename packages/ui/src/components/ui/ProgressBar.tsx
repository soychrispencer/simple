"use client";
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
}

export function ProgressBar({ current, total, labels, className = '' }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.max(0, Math.min(100, (current / safeTotal) * 100));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-lighttext dark:text-darktext">
          Paso {current} de {total}
        </span>
        {labels && labels[current - 1] && (
          <span className="text-sm text-lighttext/70 dark:text-darktext/70">
            {labels[current - 1]}
          </span>
        )}
      </div>
      <div className="w-full h-2">
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="block w-full h-2 rounded-full overflow-hidden"
          aria-hidden
        >
          <rect x="0" y="0" width="100" height="8" rx="4" className="fill-lightborder/20 dark:fill-darkborder/20" />
          <rect
            x="0"
            y="0"
            width={percentage}
            height="8"
            rx="4"
            className="fill-primary transition-all duration-300 ease-out"
          />
        </svg>
      </div>
    </div>
  );
}
