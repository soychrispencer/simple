"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

type Option = { label: string; value: string | number };

interface SelectProps {
  label?: string;
  options: Option[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  shape?: 'rounded' | 'pill';
  size?: 'sm' | 'md';
  colorHexMap?: Record<string, string>; // opcional: mostrar dot
}

// Estilos compartidos con Input:
// - Misma altura por size (sm=32px aprox, md=40px)
// - Soporte de shape pill para consistencia visual
// - Foco: ring-inset negro (light) / blanco (dark) sin offset externo
const sizeMap: Record<string, string> = {
  md: 'h-10 text-sm px-4',
  sm: 'h-8 text-xs px-3'
};
const shapeMap: Record<string, string> = {
  rounded: 'rounded-lg',
  pill: 'rounded-full'
};

export default function Select({ label, options, value, onChange, error, placeholder, className = "", disabled, shape='rounded', size='md', colorHexMap }: SelectProps) {
  const [open, setOpen] = useState(false);
  // focused eliminado: no se utilizaba para styling
  const [highlighted, setHighlighted] = useState<number>(-1); // índice resaltado para navegación teclado
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlighted(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cierra cuando cambia el valor externamente
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Función para abrir y preparar highlighting
  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    // Colocar highlight en opción seleccionada o primera
    const idx = options.findIndex(o => String(o.value) === String(value));
    setHighlighted(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHighlighted(-1);
    // devolver foco al botón por accesibilidad
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => {
        const next = h + 1;
        return next >= options.length ? 0 : next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => {
        const prev = h - 1;
        return prev < 0 ? options.length - 1 : prev;
      });
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlighted >= 0 && options[highlighted]) {
        const opt = options[highlighted];
        if (onChange) onChange(opt.value);
        closeMenu();
      }
    }
  };

  const selected = options.find(opt => String(opt.value) === String(value));

  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium mb-1 text-black dark:text-white">{label}</span>}
  <div ref={ref} className={`relative w-full ${className}` + (disabled ? " opacity-60 pointer-events-none" : "") }>
        <button
          ref={buttonRef}
          type="button"
          data-invalid={!!error || undefined}
          className={[
            // Base visual alineada con Input
            'w-full flex items-center justify-between text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none',
            'bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)]',
            'hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]',
            'placeholder:text-[var(--field-placeholder)]',
            // Nuevo foco: ring inset negro/blanco (sin offset) para evitar halo externo sobredimensionado
            'focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white',
            error ? 'border-[var(--field-invalid-border)] focus-visible:ring-[var(--field-invalid-ring)]' : '',
            sizeMap[size] || sizeMap.md,
            shapeMap[shape] || shapeMap.rounded,
            className
          ].join(' ')}
          onClick={() => {
            if (open) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
          // onFocus/onBlur de tracking de estado eliminados
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
        >
          <span className={selected ? 'flex items-center gap-2' : 'text-gray-400'}>
            {selected && colorHexMap && colorHexMap[String(selected.value)] && (
              <span
                className="inline-block w-3 h-3 rounded-full border border-black/10 dark:border-white/20"
                style={{ backgroundColor: colorHexMap[String(selected.value)] }}
              />
            )}
            {selected ? selected.label : (placeholder || 'Selecciona una opción')}
          </span>
          <svg className={`ml-2 w-4 h-4 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
        {open && (
          <ul
            ref={listRef}
            className="absolute z-30 left-0 mt-2 w-full bg-white dark:bg-[#303030] rounded-xl shadow-lg max-h-60 overflow-auto animate-fade-in outline-none"
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            {options.map((opt, idx) => {
              const active = String(opt.value) === String(value);
              const isHighlighted = idx === highlighted;
              const hex = colorHexMap && colorHexMap[String(opt.value)];
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  className={[
                    'px-4 py-2 cursor-pointer flex items-center gap-2 select-none',
                    active ? 'bg-primary/10 font-semibold' : '',
                    isHighlighted && !active ? 'bg-primary/5' : '',
                    'hover:bg-primary/10'
                  ].join(' ')}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={(e) => {
                    // Primero cerramos para evitar condiciones de carrera en re-render
                    closeMenu();
                    // Detenemos propagación por si el Select está dentro de un Label u otro handler
                    e.stopPropagation();
                    e.preventDefault();
                    if (onChange) onChange(opt.value);
                  }}
                >
                  {hex && (
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: hex }}
                    />
                  )}
                  {opt.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && <span className="block text-xs text-red-500 mt-1">{error}</span>}
    </label>
  );
}
