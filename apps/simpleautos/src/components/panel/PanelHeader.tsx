"use client";
import React from "react";
// Peque�a utilidad para concatenar clases sin a�adir dependencia externa
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface PanelHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode; // zona inferior opcional (tabs, progreso, filtros, etc.)
  compact?: boolean; // reduce padding vertical
  className?: string;
}

/**
 * Cabecera unificada para p�ginas del panel.
 * Estructura: t�tulo + descripci�n + acciones a la derecha y slot inferior opcional.
 */
export function PanelHeader({
  title,
  description,
  actions,
  children,
  compact = false,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "card-surface flex flex-col",
        compact ? "p-4" : "p-6",
        children ? "gap-4" : "gap-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
      {children && (
        <div className="pt-2 border-t border-border/60">
          {children}
        </div>
      )}
    </div>
  );
}

export default PanelHeader;







