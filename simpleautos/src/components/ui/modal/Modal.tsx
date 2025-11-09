"use client";
import React from "react";

export default function Modal({ open, onClose, title, children, footer, showClose }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; showClose?: boolean; }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, open]);
  return (
    <div className={open ? "fixed inset-0 z-50" : "hidden"}>
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div
          className="w-full max-w-3xl bg-white dark:bg-darkcard rounded-2xl shadow-modal overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {title && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black dark:text-white">{title}</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white">✕</button>
            </div>
          )}
          {!title && showClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-black dark:hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          )}
          <div className="p-4">{children}</div>
          {footer && <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
