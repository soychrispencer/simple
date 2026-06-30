'use client';

import { useState } from 'react';
import { IconPlus, IconMapPin } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelNotice } from '../panel';
import type { AddressBookEntry } from '@simple/types';

type BusinessAddressSelectorProps = {
    personalAddresses: AddressBookEntry[];
    selectedAddressId: string | null;
    onSelectAddress: (addressId: string | null) => void;
    onCreateNew: () => void;
    loading?: boolean;
};

export function BusinessAddressSelector({
    personalAddresses,
    selectedAddressId,
    onSelectAddress,
    onCreateNew,
    loading = false,
}: BusinessAddressSelectorProps) {
    const [showPersonal, setShowPersonal] = useState(false);

    if (loading) {
        return (
            <PanelCard size="sm">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                    Cargando direcciones...
                </div>
            </PanelCard>
        );
    }

    if (selectedAddressId) {
        const selected = personalAddresses.find((a) => a.id === selectedAddressId);
        return (
            <PanelCard size="sm">
                <div className="flex items-start gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                        <IconMapPin size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{selected?.label}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>{selected?.addressLine1}</p>
                        {(selected?.communeName || selected?.regionName) && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {[selected.communeName, selected.regionName].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                    <PanelButton variant="secondary" size="sm" onClick={() => onSelectAddress(null)}>
                        Cambiar
                    </PanelButton>
                </div>
            </PanelCard>
        );
    }

    if (!showPersonal) {
        return (
            <PanelCard size="sm">
                <div className="flex flex-col gap-3">
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        Selecciona una dirección para tu negocio:
                    </p>
                    <div className="flex gap-3">
                        <PanelButton variant="secondary" onClick={() => setShowPersonal(true)} className="flex-1">
                            <IconMapPin size={15} /> Usar dirección personal
                        </PanelButton>
                        <PanelButton variant="accent" onClick={onCreateNew} className="flex-1">
                            <IconPlus size={15} /> Dirección nueva
                        </PanelButton>
                    </div>
                </div>
            </PanelCard>
        );
    }

    return (
        <PanelCard size="sm">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                        Tus direcciones personales
                    </p>
                    <PanelButton variant="ghost" size="sm" onClick={() => setShowPersonal(false)}>
                        Cancelar
                    </PanelButton>
                </div>
                {personalAddresses.length === 0 ? (
                    <PanelNotice tone="neutral">
                        No tienes direcciones personales. Ve a "Mi cuenta" para agregar una.
                    </PanelNotice>
                ) : (
                    <div className="flex flex-col gap-2">
                        {personalAddresses.map((address) => (
                            <button
                                key={address.id}
                                type="button"
                                onClick={() => {
                                    onSelectAddress(address.id);
                                    setShowPersonal(false);
                                }}
                                className="flex items-start gap-3 p-3 rounded-lg border text-left transition-colors hover:border-[--accent-border]"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                >
                                    <IconMapPin size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{address.label}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-secondary)' }}>{address.addressLine1}</p>
                                    {(address.communeName || address.regionName) && (
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                            {[address.communeName, address.regionName].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                <PanelButton variant="secondary" size="sm" onClick={() => setShowPersonal(false)}>
                    Volver
                </PanelButton>
            </div>
        </PanelCard>
    );
}
