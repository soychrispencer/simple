"use client";
import React from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClass?: string; // e.g. w-full sm:w-[420px]
}

export default function Drawer({ open, onClose, title, children, widthClass = 'w-full sm:w-[420px]' }: DrawerProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
         <div className="absolute inset-0 bg-[var(--overlay-scrim-50)]" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className={`h-full card-surface card-surface-raised border border-[var(--field-border)] shadow-card flex flex-col ${widthClass} animate-slide-in-left`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--field-border)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-[var(--field-bg)] text-[var(--text-secondary)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-a40)] transition"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {children}
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes slideInRightDrawer { from { transform: translateX(100%); opacity: .3;} to { transform: translateX(0); opacity:1;} } .animate-slide-in-left { animation: slideInRightDrawer .22s cubic-bezier(.4,0,.2,1); }",
        }}
      />
    </div>
  );
}