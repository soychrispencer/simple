'use client';

import type { ReactNode } from 'react';
import { PanelBlockHeader, PanelNotice } from '../panel/panel-primitives.js';

export type MarketplaceAutosFleetRentFieldsProps = {
    rentDaily: string;
    rentMinDays: string;
    rentKmPerDayIncluded: string;
    rentDeposit: string;
    rentRequirements: string;
    rentInsuranceIncluded: boolean;
    onChange: (patch: Partial<{
        rentDaily: string;
        rentMinDays: string;
        rentKmPerDayIncluded: string;
        rentDeposit: string;
        rentRequirements: string;
        rentInsuranceIncluded: boolean;
    }>) => void;
};

export function MarketplaceAutosFleetRentFields({
    rentDaily,
    rentMinDays,
    rentKmPerDayIncluded,
    rentDeposit,
    rentRequirements,
    rentInsuranceIncluded,
    onChange,
}: MarketplaceAutosFleetRentFieldsProps) {
    return (
        <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
            <PanelBlockHeader
                title="Condiciones de arriendo"
                description="Detalla tarifa diaria, garantía y requisitos para rent a car o flota."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tarifa diaria (CLP)" hint="Opcional si ya indicaste precio mensual.">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-input w-full"
                        placeholder="45.000"
                        value={rentDaily}
                        onChange={(event) => onChange({ rentDaily: event.target.value })}
                    />
                </Field>
                <Field label="Mínimo de días">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-input w-full"
                        placeholder="3"
                        value={rentMinDays}
                        onChange={(event) => onChange({ rentMinDays: event.target.value })}
                    />
                </Field>
                <Field label="Km incluidos por día">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-input w-full"
                        placeholder="200"
                        value={rentKmPerDayIncluded}
                        onChange={(event) => onChange({ rentKmPerDayIncluded: event.target.value })}
                    />
                </Field>
                <Field label="Garantía / depósito">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="form-input w-full"
                        placeholder="500.000"
                        value={rentDeposit}
                        onChange={(event) => onChange({ rentDeposit: event.target.value })}
                    />
                </Field>
            </div>
            <Field label="Requisitos del arrendatario" hint="Licencia, edad mínima, tarjeta de crédito, etc.">
                <textarea
                    className="form-input w-full min-h-[88px]"
                    placeholder="Ej: Licencia clase B vigente, mayor de 25 años, tarjeta de crédito."
                    value={rentRequirements}
                    onChange={(event) => onChange({ rentRequirements: event.target.value })}
                />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--fg)] cursor-pointer">
                <input
                    type="checkbox"
                    checked={rentInsuranceIncluded}
                    onChange={(event) => onChange({ rentInsuranceIncluded: event.target.checked })}
                    className="rounded border-[var(--border)]"
                />
                Seguro básico incluido en la tarifa
            </label>
        </section>
    );
}

export type MarketplaceAutosConsignmentFieldsProps = {
    consignmentCommission: string;
    consignmentTerms: string;
    onChange: (patch: Partial<{
        consignmentCommission: string;
        consignmentTerms: string;
    }>) => void;
};

export function MarketplaceAutosConsignmentFields({
    consignmentCommission,
    consignmentTerms,
    onChange,
}: MarketplaceAutosConsignmentFieldsProps) {
    return (
        <section className="bg-[var(--surface)] rounded-2xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
            <PanelBlockHeader
                title="Consignación"
                description="Comisión y condiciones de retiro para avisos en consignación o compraventa."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Comisión (%)" hint="Porcentaje sobre el precio de venta.">
                    <input
                        type="text"
                        inputMode="decimal"
                        className="form-input w-full"
                        placeholder="5"
                        value={consignmentCommission}
                        onChange={(event) => onChange({ consignmentCommission: event.target.value })}
                    />
                </Field>
            </div>
            <Field label="Condiciones y plazos" hint="Retiro del vehículo, exclusividad, gastos, etc.">
                <textarea
                    className="form-input w-full min-h-[88px]"
                    placeholder="Ej: Comisión al vender, 60 días de exclusividad, retiro sin costo si no se vende."
                    value={consignmentTerms}
                    onChange={(event) => onChange({ consignmentTerms: event.target.value })}
                />
            </Field>
        </section>
    );
}

export function MarketplacePropiedadesRentAdminHint() {
    return (
        <PanelNotice tone="neutral">
            Según tu perfil de arriendo o administración, completa mascotas, amoblado, gastos comunes y condiciones especiales (garantía, plazo mínimo y requisitos del arrendatario).
        </PanelNotice>
    );
}

function Field(props: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--fg)]">{props.label}</label>
            {props.children}
            {props.hint ? <p className="text-xs text-[var(--fg-muted)] mt-1">{props.hint}</p> : null}
        </div>
    );
}
