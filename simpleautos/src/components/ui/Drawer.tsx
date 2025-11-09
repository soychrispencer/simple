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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div className={`h-full bg-white dark:bg-darkcard shadow-xl flex flex-col ${widthClass} animate-slide-in-left`}> 
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
            <button onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-black dark:hover:text-white transition">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {children}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes slideInRightDrawer { from { transform: translateX(100%); opacity: .3;} to { transform: translateX(0); opacity:1;} }
        .animate-slide-in-left { animation: slideInRightDrawer .22s cubic-bezier(.4,0,.2,1); }
      `}</style>
    </div>
  );
}
