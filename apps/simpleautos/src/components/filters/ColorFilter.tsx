"use client";
import React from 'react';
import { getColorOptions } from '@/lib/colors';

export interface ColorFilterProps {
  value: string[];
  onChange: (next: string[]) => void;
  limitCollapsed?: number; // cuantos mostrar antes de colapsar
  className?: string;
}

// Botón pill reutilizable
const PillButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 h-8 rounded-full text-xs font-medium border transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)] inline-flex items-center
      ${active
        ? 'bg-primary text-[var(--color-on-primary)] border-primary shadow-sm'
        : 'bg-[var(--field-bg)] text-[var(--field-text)] border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]'}
    `}
  >{label}</button>
);

const ALL_COLORS = getColorOptions(false).filter(c => c.value !== '');

export const ColorFilter: React.FC<ColorFilterProps> = ({ value, onChange, limitCollapsed = 10, className = '' }) => {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? ALL_COLORS : ALL_COLORS.slice(0, limitCollapsed);

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">Color</label>
        {value.length > 0 && (
          <button type="button" onClick={clearAll} className="text-[10px] text-primary hover:underline">Limpiar</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {shown.map(opt => (
          <PillButton
            key={opt.value}
            label={opt.label}
            active={value.includes(opt.value)}
            onClick={() => toggle(opt.value)}
          />
        ))}
        {ALL_COLORS.length > limitCollapsed && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="px-3 h-8 rounded-full text-xs font-medium border border-dashed border-[var(--field-border)] text-lighttext dark:text-darktext hover:bg-[var(--field-bg-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)]"
          >{expanded ? 'Menos' : 'Más'}</button>
        )}
      </div>
      {value.length > 0 && (
        <p className="mt-2 text-[11px] text-lighttext/70 dark:text-darktext/70">{value.length} seleccionado{value.length>1?'s':''}</p>
      )}
    </div>
  );
};

export default ColorFilter;







