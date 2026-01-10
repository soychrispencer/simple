"use client";
import React, { useState, useEffect } from "react";

interface PriceRangeInputProps {
  minValue: string; // raw digits ("" o "1500000")
  maxValue: string;
  onChange: (values: { price_min: string; price_max: string }) => void;
  className?: string;
}

function formatCLP(raw: string) {
  if (!raw) return "";
  try {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return "";
    return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return raw;
  }
}

function sanitize(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export const PriceRangeInput: React.FC<PriceRangeInputProps> = ({ minValue, maxValue, onChange, className }) => {
  const [displayMin, setDisplayMin] = useState("");
  const [displayMax, setDisplayMax] = useState("");

  // Sync external changes (por si se limpian desde fuera)
  useEffect(() => { setDisplayMin(formatCLP(minValue)); }, [minValue]);
  useEffect(() => { setDisplayMax(formatCLP(maxValue)); }, [maxValue]);

  const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = sanitize(e.target.value);
    onChange({ price_min: digits, price_max: maxValue });
    setDisplayMin(formatCLP(digits));
  };
  const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = sanitize(e.target.value);
    onChange({ price_min: minValue, price_max: digits });
    setDisplayMax(formatCLP(digits));
  };

  const handleBlurOrder = () => {
    if (minValue && maxValue) {
      const minN = parseInt(minValue, 10);
      const maxN = parseInt(maxValue, 10);
      if (minN > maxN) {
        // Intercambiar para mantener coherencia
        onChange({ price_min: maxValue, price_max: minValue });
      }
    }
  };

  return (
    <div className={"flex gap-2 " + (className || "")}>     
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">$</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Precio mínimo"
            placeholder="Precio mín."
          value={displayMin}
          onChange={handleMin}
          onBlur={handleBlurOrder}
          name="price_min"
          autoComplete="off"
          className="w-full h-10 rounded-full pl-6 pr-3 text-sm bg-[var(--field-bg)] text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)] transition"
        />
      </div>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">$</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Precio máximo"
          placeholder="Precio máx."
          value={displayMax}
          onChange={handleMax}
          onBlur={handleBlurOrder}
          name="price_max"
          autoComplete="off"
          className="w-full h-10 rounded-full pl-6 pr-3 text-sm bg-[var(--field-bg)] text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)] transition"
        />
      </div>
    </div>
  );
};

export default PriceRangeInput;







