'use client';

import { useState, useEffect } from 'react';
import { IconMapPin, IconPalette, IconX } from '@tabler/icons-react';
import { PanelButton, PanelNotice } from '@simple/ui';
import ModernSelect from '@/components/ui/modern-select';
import { fetchAddressBook, LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import type { ListingLocation, AddressBookEntry } from '@simple/types';
import { createEmptyListingLocation } from '@simple/types';
import type { QuickBasicData, GeneratedText } from './types';
import Step3Pricing from './Step3Pricing';
import Step3Text from './Step3Text';

interface Props {
    basicData: QuickBasicData;
    generatedText: GeneratedText | null;
    isGenerating: boolean;
    isPublishing: boolean;
    publishError: string | null;
    detectedColor: string | null;
    initialPricing?: any; // For draft values
    onUpdateText: (titulo: string, descripcion: string) => void;
    onUpdatePricing: (data: any) => void;
    onUpdateLocation: (data: ListingLocation | null) => void;
    onGenerateText: () => void;
    onPublish: () => void;
    onBack: () => void;
}

export default function Step3Preview({
    basicData,
    generatedText,
    isGenerating,
    isPublishing,
    publishError,
    detectedColor,
    onUpdateText,
    onUpdatePricing,
    onUpdateLocation,
    onGenerateText,
    onPublish,
    onBack,
}: Props) {
    const [colorBannerDismissed, setColorBannerDismissed] = useState(false);
    const [priceError, setPriceError] = useState('');

    // Location state
    const [locLoading, setLocLoading] = useState(true);
    const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [regionId, setRegionId] = useState('');
    const [communeId, setCommuneId] = useState('');

    useEffect(() => {
        fetchAddressBook().then((result) => {
            const items = result.items ?? [];
            setAddressBook(items);
            const defaultAddr = items.find((a) => a.isDefault) ?? items[0] ?? null;
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                setRegionId(defaultAddr.regionId ?? '');
                setCommuneId(defaultAddr.communeId ?? '');
            }
        }).catch(() => null).finally(() => setLocLoading(false));
    }, []);

    // Reset color banner when a new color is detected
    useEffect(() => {
        if (detectedColor) setColorBannerDismissed(false);
    }, [detectedColor]);

    function handleSelectAddress(addrId: string) {
        setSelectedAddressId(addrId);
        if (addrId === '__manual__') {
            setRegionId('');
            setCommuneId('');
            return;
        }
        const addr = addressBook.find((a) => a.id === addrId);
        if (addr) {
            setRegionId(addr.regionId ?? '');
            setCommuneId(addr.communeId ?? '');
        }
    }

    useEffect(() => {
        if (regionId && communeId) {
            const region = LOCATION_REGIONS.find((r) => r.id === regionId);
            const commune = getCommunesForRegion(regionId).find((c) => c.id === communeId);
            const loc = createEmptyListingLocation({
                sourceMode: 'area_only',
                sourceAddressId: null,
                regionId,
                regionName: region?.name ?? null,
                communeId,
                communeName: commune?.name ?? null,
                visibilityMode: 'commune_only',
                publicLabel: [commune?.name, region?.name].filter(Boolean).join(', '),
            });
            onUpdateLocation(loc);
        } else {
            onUpdateLocation(null);
        }
    }, [regionId, communeId, onUpdateLocation]);

    function handlePublish() {
        if (!basicData.price.trim() && basicData.listingType === 'sale') {
            setPriceError('Escribe el precio');
            return;
        }
        setPriceError('');
        onPublish();
    }

    return (
        <div className="flex flex-col gap-6">

            {/* PRECIO */}
            <div className="flex flex-col gap-3">
                <p className="type-overline text-[var(--fg-muted)]">Precio y condiciones</p>
                <Step3Pricing
                    data={basicData}
                    onChange={(updates) => onUpdatePricing({ ...basicData, ...updates })}
                    errors={{ price: priceError }}
                />
            </div>

            {/* UBICACIÓN */}
            <div className="border-t border-[var(--border)] pt-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <IconMapPin size={13} className="text-[var(--fg-muted)]" />
                        <p className="text-sm font-medium text-[var(--fg-secondary)]">Ubicación</p>
                        {locLoading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--fg-muted)] border-t-transparent ml-1" />}
                    </div>
                </div>

                {addressBook.length > 0 && (
                    <ModernSelect
                        value={selectedAddressId}
                        onChange={handleSelectAddress}
                        options={[
                            ...addressBook.map((addr) => ({
                                value: addr.id,
                                label: `${addr.label}${addr.isDefault ? ' (predeterminada)' : ''}${addr.communeName ? ` — ${addr.communeName}` : ''}`,
                            })),
                            { value: '__manual__', label: 'Otra ubicación…' },
                        ]}
                        placeholder="Seleccionar"
                    />
                )}

                <div className="grid grid-cols-2 gap-3">
                    <ModernSelect
                        value={regionId}
                        onChange={(v) => { setRegionId(v); setCommuneId(''); setSelectedAddressId('__manual__'); }}
                        options={LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }))}
                        placeholder="Región"
                    />
                    <ModernSelect
                        value={communeId}
                        onChange={(v) => setCommuneId(v)}
                        disabled={!regionId}
                        options={getCommunesForRegion(regionId).map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Comuna"
                    />
                </div>
            </div>

            {/* ANUNCIO (IA) */}
            <div className="border-t border-[var(--border)] pt-5 flex flex-col gap-3">
                <p className="type-overline text-[var(--fg-muted)]">Anuncio</p>

                {detectedColor && !colorBannerDismissed && generatedText && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)]">
                        <IconPalette size={13} className="text-[var(--fg-muted)] flex-shrink-0" />
                        <span className="text-[var(--fg-secondary)]">
                            Color detectado: <strong className="text-[var(--fg)]">{detectedColor}</strong>
                        </span>
                        <button type="button" onClick={() => setColorBannerDismissed(true)} className="ml-auto flex-shrink-0">
                            <IconX size={12} className="text-[var(--fg-muted)]" />
                        </button>
                    </div>
                )}

                <Step3Text
                    data={basicData}
                    generatedText={generatedText}
                    isGenerating={isGenerating}
                    onUpdateText={onUpdateText}
                    onGenerateText={onGenerateText}
                />
            </div>

            {/* ERROR */}
            {publishError && <PanelNotice tone="error">{publishError}</PanelNotice>}

            {/* ACTIONS */}
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
                {!generatedText && !isGenerating && (
                    <p className="text-[11px] text-center text-[var(--fg-muted)]">
                        Se publicará con un título básico si no generas uno con IA.
                    </p>
                )}
                <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
                    <PanelButton variant="ghost" onClick={onBack} disabled={isPublishing} className="w-full md:w-auto">
                        ← Volver
                    </PanelButton>
                    <PanelButton variant="primary" onClick={handlePublish} disabled={isPublishing} className="w-full md:w-auto shadow-lg">
                        {isPublishing ? (
                            <div className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Publicando…
                            </div>
                        ) : 'Publicar ahora 🚀'}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}
