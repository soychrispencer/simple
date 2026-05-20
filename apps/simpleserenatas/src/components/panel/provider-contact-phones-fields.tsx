'use client';

import { useEffect, useState } from 'react';
import { IconLink, IconLinkOff } from '@tabler/icons-react';
import { PanelField, PanelIconButton } from '@simple/ui';
import { formatChileMobileHint } from '@/lib/chile-phone';
import { FieldInput } from './shared';

function digitsOnly(value: string) {
    return value.replace(/\D/g, '');
}

function inferSameAsPhone(phone: string, whatsapp: string) {
    const p = phone.trim();
    const w = whatsapp.trim();
    if (!w) return true;
    if (!p) return false;
    return digitsOnly(p) === digitsOnly(w);
}

type ProviderContactPhonesFieldsProps = {
    /** Cambia al cargar otro mariachi para reiniciar el enlace. */
    resetKey?: string;
    phone: string;
    whatsapp: string;
    onPhoneChange: (value: string) => void;
    onWhatsappChange: (value: string) => void;
};

export function ProviderContactPhonesFields({
    resetKey,
    phone,
    whatsapp,
    onPhoneChange,
    onWhatsappChange,
}: ProviderContactPhonesFieldsProps) {
    const [linked, setLinked] = useState(() => inferSameAsPhone(phone, whatsapp));

    useEffect(() => {
        setLinked(inferSameAsPhone(phone, whatsapp));
    }, [resetKey]);

    const handlePhoneChange = (value: string) => {
        onPhoneChange(value);
        if (linked) onWhatsappChange(value);
    };

    const toggleLinked = () => {
        const next = !linked;
        setLinked(next);
        if (next) onWhatsappChange(phone);
    };

    const linkLabel = linked
        ? 'WhatsApp usa el mismo número que teléfono. Pulsa para usar otro número.'
        : 'WhatsApp con número distinto. Pulsa para usar el mismo que teléfono.';

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <PanelField label="Teléfono">
                <FieldInput
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+56 9 1234 5678"
                />
            </PanelField>

            <PanelField label="WhatsApp">
                <div className="flex gap-2">
                    <FieldInput
                        type="tel"
                        autoComplete="tel"
                        value={linked ? phone : whatsapp}
                        onChange={(e) => onWhatsappChange(e.target.value)}
                        placeholder={formatChileMobileHint()}
                        disabled={linked}
                        aria-label={linked ? 'WhatsApp (mismo número que teléfono)' : 'WhatsApp'}
                        className={`min-w-0 flex-1 ${linked ? 'text-fg-muted' : ''}`}
                    />
                    <PanelIconButton
                        type="button"
                        label={linkLabel}
                        onClick={toggleLinked}
                        variant={linked ? 'soft' : 'ghost'}
                        size="md"
                        className={`h-[42px] w-[42px] shrink-0 ${
                            linked ? 'text-accent ring-1 ring-accent/25' : 'text-fg-muted hover:text-fg'
                        }`}
                    >
                        {linked ? <IconLink size={18} stroke={2} /> : <IconLinkOff size={18} stroke={1.75} />}
                    </PanelIconButton>
                </div>
            </PanelField>

            <p className="text-xs text-fg-muted sm:col-span-2">
                {linked
                    ? 'WhatsApp usará el mismo número que teléfono.'
                    : 'Teléfono para llamar; WhatsApp puede ser otro número móvil.'}
            </p>
        </div>
    );
}
