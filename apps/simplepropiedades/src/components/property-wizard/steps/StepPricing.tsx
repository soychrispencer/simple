"use client";
import React from "react";
import { useWizard, type PropertyWizardData } from "../context/WizardContext";

const currencyOptions = [
  { value: "CLP", label: "CLP" },
  { value: "USD", label: "USD" },
];

type RentPeriod = NonNullable<PropertyWizardData["pricing"]["rent_period"]>;

const rentPeriodOptions: Array<{ value: RentPeriod; label: string }> = [
  { value: "monthly", label: "Mensual" },
  { value: "weekly", label: "Semanal" },
  { value: "daily", label: "Diario" },
];

function StepPricing() {
  const { state, patchSection } = useWizard();
  const listingType = state.data.type.listing_type;
  const { price, rent_price, currency, rent_period } = state.data.pricing;

  const handleNumber = (field: "price" | "rent_price", raw: string) => {
    const next = raw === "" ? null : Number(raw);
    patchSection("pricing", { [field]: Number.isFinite(next) ? next : null });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">Moneda</span>
          <select
            value={currency}
            onChange={(event) => patchSection("pricing", { currency: event.target.value as typeof currency })}
            className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
          >
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {listingType === "rent" ? (
          <label className="space-y-1">
            <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">Periodo</span>
            <select
              value={rent_period ?? "monthly"}
              onChange={(event) => patchSection("pricing", { rent_period: event.target.value as RentPeriod })}
              className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
            >
              {rentPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {listingType === "rent" ? (
        <PriceInput
          label="Valor de arriendo"
          value={rent_price ?? ""}
          onChange={(value) => handleNumber("rent_price", value)}
          placeholder="800000"
        />
      ) : (
        <PriceInput
          label="Precio de venta"
          value={price ?? ""}
          onChange={(value) => handleNumber("price", value)}
          placeholder="240000000"
        />
      )}

      <div className="rounded-xl card-surface ring-1 ring-border/60 p-4 text-sm text-lighttext/70 dark:text-darktext/70">
        <p className="font-medium text-lighttext dark:text-darktext">Reglas de visibilidad</p>
        <p>
          El precio se sincroniza con Simple y portales externos. Podrás activar promociones o descuentos desde el panel comercial en los próximos lanzamientos.
        </p>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
      />
    </label>
  );
}

export default StepPricing;
