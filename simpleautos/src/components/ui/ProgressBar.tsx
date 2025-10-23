"use client";
import React from "react";

interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
}

export default function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const progress = (current / total) * 100;

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        {labels?.map((label, index) => (
          <span key={index} className={index < current ? "text-primary font-medium" : ""}>
            {label}
          </span>
        ))}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        Paso {current} de {total}
      </div>
    </div>
  );
}
