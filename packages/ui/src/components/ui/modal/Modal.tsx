"use client";
import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  showClose?: boolean;
  maxWidth?: string;
  containerClassName?: string;
  contentClassName?: string;
  role?: string;
}

/**
 * Contenedor base de modal unificado. Aplica overlay, superficie card, borde y sombra consistentes.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  showClose = true,
  maxWidth = "max-w-3xl",
  containerClassName = "",
  contentClassName = "",
  role = "dialog",
}: ModalProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--overlay-scrim-60)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`relative w-full ${maxWidth} overflow-hidden card-surface shadow-card ${containerClassName}`}
        onClick={(e) => e.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-label={title || undefined}
      >
        {title && (
          <div className="px-6 py-4 border-b border-border/60 card-surface flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            {showClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)]"
                aria-label="Cerrar"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {!title && showClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        )}

        <div className={`p-6 text-[var(--text-primary)] ${contentClassName}`}>{children}</div>

        {footer && <div className="px-6 py-4 border-t border-border/60 card-surface">{footer}</div>}
      </div>
    </div>
  );
}