"use client";
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
}

export function ProgressBar({ current, total, labels, className = '' }: ProgressBarProps) {
  const percentage = (current / total) * 100;

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
      <div className="w-full bg-lightborder/20 dark:bg-darkborder/20 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}