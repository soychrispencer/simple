'use client';

import { useState, useCallback, useEffect } from 'react';
import { IconSparkles, IconX } from '@tabler/icons-react';
import { PanelNotice, PanelSwitch, PanelButton } from '@simple/ui';
import ModernSelect from '@/components/ui/modern-select';
import { getPriceReference, type PriceReferenceResult } from '@/actions/get-price-reference';
import { formatPrice } from '@/hooks/useQuickPublish';
import type { QuickBasicData } from './types';
import { loadPublishWizardCatalog, type PublishWizardCatalog } from '@/lib/publish-wizard-catalog';

interface Props {
    data: QuickBasicData;
    onChange: (updates: Partial<QuickBasicData>) => void;
    isExtended?: boolean;
    errors?: Record<string, string>;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                {label}{required && <abbr title="requerido" style={{ color: 'var(--color-error, #ef4444)', textDecoration: 'none' }}> *</abbr>}
            </label>
            {children}
            {error && <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>{error}</p>}
        </div>
    );
}

export default function Step3Pricing({ data, onChange, isExtended = false, errors = {} }: Props) {
    const [priceRef, setPriceRef] = useState<PriceReferenceResult | null>(null);
    const [priceRefLoading, setPriceRefLoading] = useState(false);
    const [priceRefHint, setPriceRefHint] = useState('');
    const [catalog, setCatalog] = useState<PublishWizardCatalog | null>(null);

    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog).catch(() => null);
    }, []);

    const set = useCallback((updates: Partial<QuickBasicData>) => {
        onChange(updates);
    }, [onChange]);

    async function handleLoadPriceRef() {
        const brandName = data.brandId === '__custom__'
            ? data.customBrand
            : catalog?.brands.find((b) => b.id === data.brandId)?.name;
        const modelName = data.modelId === '__custom__'
            ? data.customModel
            : catalog?.models.find((m) => m.id === data.modelId)?.name;

        if (!brandName || !modelName || !data.year) {
            setPriceRefHint('Completa marca, modelo y año primero');
            return;
        }
        setPriceRefHint('');
        const mileageRaw = data.mileage?.replace(/\D/g, '') ?? '';
        setPriceRefLoading(true);
        setPriceRef(null);
        try {
            const result = await getPriceReference({
                brand: brandName,
                model: modelName,
                year: parseInt(data.year, 10),
                vehicleType: data.vehicleType ?? 'car',
                mileageKm: mileageRaw ? parseInt(mileageRaw, 10) : null,
                operationType: data.listingType === 'rent' ? 'rent' : 'sale',
            });
            setPriceRef(result);
        } finally {
            setPriceRefLoading(false);
        }
    }

    const priceLabel = data.listingType === 'rent' ? 'Precio / mes' : data.listingType === 'auction' ? 'Precio base' : 'Precio';

    // Calculation for preview
    const mainPrice = parseInt(data.price.replace(/\D/g, '') || '0', 10);
    let finalPrice: number | null = null;
    let discountPct: number | null = null;
    if (mainPrice && data.offerPrice) {
        if (data.offerPriceMode === '%') {
            const pct = parseInt(data.offerPrice, 10);
            if (pct > 0 && pct < 100) { finalPrice = Math.round(mainPrice * (1 - pct / 100)); discountPct = pct; }
        } else {
            const op = parseInt(data.offerPrice.replace(/\D/g, '') || '0', 10);
            if (op > 0 && op < mainPrice) { finalPrice = op; discountPct = Math.round((1 - op / mainPrice) * 100); }
        }
    }

    return (
        <div className="flex flex-col gap-5">
            {/* SALE SECTION */}
            {data.listingType === 'sale' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label={priceLabel} required error={errors.price}>
                            <div className="relative flex items-center h-[42px] rounded-[var(--radius)] border bg-[var(--bg-subtle)] focus-within:border-[var(--accent-border)] transition-colors overflow-hidden"
                                 style={{ borderColor: errors.price ? 'var(--color-error, #ef4444)' : 'var(--border)' }}>
                                <span className="pl-3 pr-1 text-sm font-medium text-[var(--fg-muted)]">$</span>
                                <input className="flex-1 bg-transparent border-none outline-none h-full text-sm pr-2"
                                    placeholder="Ej: 18.990.000" inputMode="numeric"
                                    value={data.price.replace(/^\$\s*/, '')}
                                    onChange={(e) => set({ price: formatPrice(e.target.value) })} />
                                {isExtended && (
                                    <div className="w-[72px] border-l border-[var(--border)]">
                                        <ModernSelect
                                            value={data.currency || 'CLP'}
                                            onChange={(v) => set({ currency: v as 'CLP' | 'USD' })}
                                            options={[{ value: 'CLP', label: 'CLP' }, { value: 'USD', label: 'USD' }]}
                                        />
                                    </div>
                                )}
                            </div>
                        </Field>

                        <Field label="Precio oferta (opcional)" error={errors.offerPrice}>
                            <div className="flex items-center gap-1.5 h-[42px]">
                                <div className="flex-1 flex items-center h-full rounded-[var(--radius)] border bg-[var(--bg-subtle)] focus-within:border-[var(--accent-border)] transition-colors overflow-hidden"
                                     style={{ borderColor: 'var(--border)' }}>
                                    <input className="flex-1 bg-transparent border-none outline-none h-full text-sm px-3"
                                        placeholder={data.offerPriceMode === '%' ? '10' : 'Opcional'} inputMode="numeric"
                                        value={data.offerPriceMode === '%' ? data.offerPrice : data.offerPrice.replace(/^\$\s*/, '')}
                                        onChange={(e) => {
                                            if (data.offerPriceMode === '%') set({ offerPrice: e.target.value.replace(/\D/g, '').slice(0, 2) });
                                            else set({ offerPrice: formatPrice(e.target.value) });
                                        }} />
                                </div>
                                <div className="w-[72px] flex-shrink-0">
                                    <ModernSelect
                                        value={data.offerPriceMode}
                                        onChange={(v) => set({ offerPriceMode: v as '$' | '%', offerPrice: '' })}
                                        options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]}
                                    />
                                </div>
                            </div>
                        </Field>
                    </div>

                    {finalPrice !== null && (
                        <div className="flex items-center justify-center gap-3 rounded-[var(--radius)] py-3 px-4 bg-[var(--bg-subtle)] border border-[var(--border)]">
                            <span className="text-sm line-through text-[var(--fg-muted)]">$ {mainPrice.toLocaleString('es-CL')}</span>
                            <span className="text-xl font-bold text-[var(--accent)]">$ {finalPrice.toLocaleString('es-CL')}</span>
                            {discountPct !== null && discountPct > 0 && (
                                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[var(--accent-subtle)] text-[var(--accent)]">-{discountPct}%</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* RENT SECTION */}
            {data.listingType === 'rent' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Precio por día"><input className="form-input" value={data.rentDaily} onChange={(e) => set({ rentDaily: e.target.value })} placeholder="Opcional" /></Field>
                    <Field label="Precio por semana"><input className="form-input" value={data.rentWeekly} onChange={(e) => set({ rentWeekly: e.target.value })} placeholder="Opcional" /></Field>
                    <Field label="Precio por mes" required error={errors.rentMonthly}><input className="form-input" value={data.rentMonthly} onChange={(e) => set({ rentMonthly: e.target.value })} placeholder="Ej: 800.000" /></Field>
                    <Field label="Días mínimos"><input className="form-input" type="number" min={1} value={data.rentMinDays} onChange={(e) => set({ rentMinDays: e.target.value })} /></Field>
                    <Field label="Depósito"><input className="form-input" value={data.rentDeposit} onChange={(e) => set({ rentDeposit: e.target.value })} placeholder="Opcional" /></Field>
                    {isExtended && (
                        <>
                            <Field label="Disponible desde"><input className="form-input" type="date" value={data.rentAvailableFrom} onChange={(e) => set({ rentAvailableFrom: e.target.value })} /></Field>
                            <Field label="Disponible hasta"><input className="form-input" type="date" value={data.rentAvailableTo} onChange={(e) => set({ rentAvailableTo: e.target.value })} /></Field>
                        </>
                    )}
                </div>
            )}

            {/* AUCTION SECTION */}
            {data.listingType === 'auction' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Precio base" required error={errors.auctionStartPrice}><input className="form-input" value={data.auctionStartPrice} onChange={(e) => set({ auctionStartPrice: e.target.value })} /></Field>
                    <Field label="Precio reserva"><input className="form-input" value={data.auctionReservePrice} onChange={(e) => set({ auctionReservePrice: e.target.value })} placeholder="Opcional" /></Field>
                    <Field label="Incremento mínimo" required error={errors.auctionMinIncrement}><input className="form-input" value={data.auctionMinIncrement} onChange={(e) => set({ auctionMinIncrement: e.target.value })} /></Field>
                    {isExtended && (
                        <>
                            <Field label="Inicio"><input className="form-input" type="datetime-local" value={data.auctionStartAt} onChange={(e) => set({ auctionStartAt: e.target.value })} /></Field>
                            <Field label="Fin"><input className="form-input" type="datetime-local" value={data.auctionEndAt} onChange={(e) => set({ auctionEndAt: e.target.value })} /></Field>
                        </>
                    )}
                </div>
            )}

            {/* MARKET REFERENCE (Only for sale/rent) */}
            {(data.listingType === 'sale' || data.listingType === 'rent') && (
                <div>
                    <button type="button" onClick={() => void handleLoadPriceRef()} disabled={priceRefLoading}
                        className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
                        {priceRefLoading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconSparkles size={11} />}
                        Ver precio de mercado
                    </button>
                    {priceRefHint && <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{priceRefHint}</p>}
                    {priceRef && (
                        <div className="mt-2 rounded-[var(--radius)] border border-[var(--border)] p-3 bg-[var(--bg-subtle)]">
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-xs font-semibold">Referencia de mercado</p>
                                <button type="button" onClick={() => setPriceRef(null)}><IconX size={13} className="text-[var(--fg-muted)]" /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div><p className="text-[10px] text-[var(--fg-muted)]">Mínimo</p><p className="text-sm font-semibold">$ {priceRef.minPrice.toLocaleString('es-CL')}</p></div>
                                <div className="border-x border-[var(--border)]"><p className="text-[10px] text-[var(--fg-muted)]">Estimado</p><p className="text-sm font-bold text-[var(--accent)]">$ {priceRef.estimatedPrice.toLocaleString('es-CL')}</p></div>
                                <div><p className="text-[10px] text-[var(--fg-muted)]">Máximo</p><p className="text-sm font-semibold">$ {priceRef.maxPrice.toLocaleString('es-CL')}</p></div>
                            </div>
                            <button type="button" onClick={() => set({ price: formatPrice(String(priceRef.estimatedPrice)) })}
                                className="w-full mt-3 text-[11px] font-medium text-[var(--accent)] hover:underline">
                                Usar estimado →
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* COMMERCIAL CONDITIONS */}
            <div className="flex flex-col gap-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Condiciones comerciales</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-subtle)]">
                        <div>
                            <p className="text-sm font-medium">Precio negociable</p>
                            <p className="text-[10px] text-[var(--fg-muted)]">Permite conversar el valor.</p>
                        </div>
                        <PanelSwitch checked={data.negotiable ?? false} onChange={(v) => set({ negotiable: v })} />
                    </div>
                    {data.listingType === 'sale' && (
                        <>
                            <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-subtle)]">
                                <div>
                                    <p className="text-sm font-medium">Financiamiento</p>
                                    <p className="text-[10px] text-[var(--fg-muted)]">Indica si aceptas créditos.</p>
                                </div>
                                <PanelSwitch checked={data.financingAvailable ?? false} onChange={(v) => set({ financingAvailable: v })} />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-subtle)]">
                                <div>
                                    <p className="text-sm font-medium">Acepta permuta</p>
                                    <p className="text-[10px] text-[var(--fg-muted)]">Recibir auto en parte de pago.</p>
                                </div>
                                <PanelSwitch checked={data.exchangeAvailable ?? false} onChange={(v) => set({ exchangeAvailable: v })} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
