"use client";
import React from "react";

interface InfoBlockProps {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  hint?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean; // variante m�s densa
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
      className={`group inline-flex max-w-full items-center gap-2 card-inset radius-md transition-base text-left ${onClick ? 'cursor-pointer hover:bg-[var(--field-bg-hover)] active:bg-[var(--field-bg-active)] focus-ring active:scale-[0.99]' : ''} ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} ${className}`}
    >
      {icon && (
        <span className="inline-flex items-center justify-center text-lighttext/70 dark:text-darktext/70 shrink-0">
          {icon}
        </span>
      )}
      <span className="sr-only">{label}</span>
      {value && (
        <span className="text-sm font-medium text-lighttext/80 dark:text-darktext/80 truncate min-w-0">{value}</span>
      )}
    </Tag>
  );
}

export default InfoBlock;







