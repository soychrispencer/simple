"use client";
import React from "react";

interface InfoBlockProps {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  hint?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean; // variante más densa
}

/**
 * InfoBlock
 * Pequeño bloque de información (icono + label + valor) usado en tarjetas de perfil.
 */
export function InfoBlock({ icon, label, value, hint, onClick, className = "", compact }: InfoBlockProps) {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={hint}
      className={`group rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-base text-left flex items-start gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50/70 dark:hover:bg-white/5 active:scale-[0.97]' : ''} ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
    >
      {icon && (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 shrink-0 group-hover:shadow-token-sm transition-base">
          {icon}
        </span>
      )}
      <span className="flex flex-col min-w-0">
        <span className="text-[11px] uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400 leading-none mb-1">{label}</span>
        {value && (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{value}</span>
        )}
      </span>
    </Tag>
  );
}

export default InfoBlock;
