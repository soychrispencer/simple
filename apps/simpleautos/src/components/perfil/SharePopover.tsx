"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import { IconBrandFacebook, IconBrandWhatsapp, IconBrandX, IconLink } from '@tabler/icons-react';

interface SharePopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  username: string;
}

export function SharePopover({ open, onClose, anchorEl, username }: SharePopoverProps) {
  const popRef = React.useRef<HTMLDivElement | null>(null);
  const firstBtnRef = React.useRef<HTMLButtonElement | null>(null);

  // Cerrar popover al hacer clic fuera
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      // No cerrar si el clic fue en el botón de compartir o su contenedor
      if (anchorEl && (anchorEl.contains(event.target as Node) || anchorEl === event.target)) {
        return;
      }
      if (popRef.current && !popRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Usar setTimeout para evitar que se cierre inmediatamente al abrir
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, anchorEl]);

  // Don't render on server
  if (typeof window === 'undefined') return null;
  if (!open || !anchorEl) return null;

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/perfil/${username}`;
  const btnCls = 'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-lighttext dark:text-darktext hover:bg-[var(--field-bg-hover)] transition-base';

  return createPortal(
    <div
      ref={popRef}
      className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-2xl card-surface shadow-card p-3 animate-fade-scale-in origin-top"
      role="dialog"
      aria-label="Compartir perfil"
      aria-modal="true"
    >
      <div className="flex flex-col gap-1">
        <button
          ref={firstBtnRef}
          className={btnCls}
          onClick={() => { navigator.clipboard.writeText(shareUrl); onClose(); }}
        >
          <IconLink size={16} /> Copiar enlace
        </button>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={btnCls}
          onClick={onClose}
        >
          <IconBrandFacebook size={16} /> Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={btnCls}
          onClick={onClose}
        >
          <IconBrandWhatsapp size={16} /> WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={btnCls}
          onClick={onClose}
        >
          <IconBrandX size={16} /> X (Twitter)
        </a>
      </div>
    </div>,
    anchorEl
  );
}

export default SharePopover;







