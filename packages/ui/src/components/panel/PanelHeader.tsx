"use client";
import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface PanelHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export default function PanelHeader({
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
          "card-surface shadow-card flex flex-col",
        compact ? "p-4" : "p-6",
        children ? "gap-4" : "gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
      {children && (
        <div className="pt-2">{children}</div>
      )}
    </div>
  );
}
