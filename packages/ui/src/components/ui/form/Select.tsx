"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

export type SelectOption = { label: string; value: string | number };

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  shape?: 'rounded' | 'pill';
  size?: 'sm' | 'md';
  colorHexMap?: Record<string, string>; // opcional: mostrar dot
  appearance?: 'filled' | 'line';
}

// Estilos compartidos con Input:
// - Misma altura por size (sm=32px aprox, md=40px)
// - Soporte de shape pill para consistencia visual
// - Foco: ring-inset usando token de borde para consistencia
const sizeMap: Record<string, string> = {
  md: 'h-10 text-sm px-4',
  sm: 'h-8 text-xs px-3'
};
const itemSizeMap: Record<string, string> = {
  md: 'text-sm',
  sm: 'text-xs'
};
const shapeMap: Record<string, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full'
};
const lineBase = 'bg-transparent border-0 border-b border-[var(--field-border)] rounded-none px-0 pb-2 hover:border-[var(--field-border-hover)] focus-visible:border-primary focus-visible:ring-0 active:border-[var(--field-border-active)]';
const filledBase = 'bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] active:bg-[var(--field-bg-active)] active:border-[var(--field-border-active)]';

export default function Select({ label, options, value, onChange, error, placeholder, className = "", disabled, shape='rounded', size='md', colorHexMap, appearance='line' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
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

  useEffect(() => {
    if (open) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    const idx = options.findIndex(o => String(o.value) === String(value));
    setHighlighted(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHighlighted(-1);
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
      {label && <span className="block text-sm font-medium mb-1 text-[var(--text-primary)]">{label}</span>}
      <div ref={ref} className={`relative w-full ${className}` + (disabled ? " opacity-60 pointer-events-none" : "") }>
        <button
          ref={buttonRef}
          type="button"
          data-invalid={!!error || undefined}
          className={[
            'w-full flex items-center justify-between text-left disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none text-[var(--field-text)]',
            appearance === 'line' ? lineBase : filledBase,
            'placeholder:text-[var(--field-placeholder)]',
            appearance === 'line' ? 'focus-visible:ring-0' : 'focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[var(--field-focus-ring)]',
            error ? 'border-[var(--field-invalid-border)] focus-visible:ring-[var(--field-invalid-ring)]' : '',
            appearance === 'line' ? `${size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm'} px-0` : `${sizeMap[size] || sizeMap.md} ${shapeMap[shape] || shapeMap.rounded}`,
            className
          ].join(' ')}
          onClick={() => {
            if (open) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
        >
          <span className={selected ? 'flex items-center gap-2' : 'text-[var(--text-secondary)]'}>
            {selected && colorHexMap && colorHexMap[String(selected.value)] && (
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: colorHexMap[String(selected.value)] }}
              />
            )}
            {selected ? selected.label : (placeholder || 'Selecciona una opción')}
          </span>
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
        </button>

        <div
          className={`absolute z-30 left-0 mt-2 w-full card-surface card-surface-raised rounded-2xl shadow-card overflow-hidden ${open ? '' : 'hidden'}`}
        >
          <ul
            ref={listRef}
            className="max-h-64 overflow-auto outline-none py-1 bg-transparent"
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
                    'px-4 py-2 cursor-pointer flex items-center gap-2 select-none text-[var(--text-primary)]',
                    itemSizeMap[size] || itemSizeMap.md,
                    active ? 'bg-[var(--color-primary-a10)] font-semibold' : '',
                    isHighlighted && !active ? 'bg-[var(--field-bg-hover)]' : '',
                    !isHighlighted && !active ? 'hover:bg-[var(--field-bg-hover)]' : ''
                  ].join(' ')}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={(e) => {
                    closeMenu();
                    e.stopPropagation();
                    e.preventDefault();
                    if (onChange) onChange(opt.value);
                  }}
                >
                  {hex && (
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: hex }}
                    />
                  )}
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {error && <span className="block text-xs text-[var(--color-danger)] mt-1">{error}</span>}
    </label>
  );
}