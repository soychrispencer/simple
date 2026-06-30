'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ALL_BUSINESS_SOCIAL_PLATFORMS,
    BUSINESS_SOCIAL_PLATFORM_META,
    type BusinessSocialLink,
    type BusinessSocialPlatform,
} from '@simple/utils';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
    IconChevronDown,
    IconLink,
    IconLinkOff,
    IconWorld,
    IconX,
} from '@tabler/icons-react';
import { PanelBlockHeader } from './panel-primitives.js';
import { PanelCard } from './panel-card.js';
import { PanelField, PanelIconButton } from './panel-display.js';
import {
    PANEL_DROPDOWN_POPOVER_CLASS,
    PANEL_DROPDOWN_POPOVER_STYLE,
    panelDropdownItemStyle,
} from '../shared/select-options.js';
import { FLOATING_POPOVER_Z_INDEX } from '../floating-portal.js';
import {
    BUSINESS_PUBLIC_CONTACT_SECTION,
    BUSINESS_PUBLIC_WHATSAPP_LINKED_HINT,
} from './business-copy.js';

const BUSINESS_SOCIAL_PLATFORM_ICONS: Record<BusinessSocialPlatform, typeof IconBrandInstagram> = {
    instagram: IconBrandInstagram,
    facebook: IconBrandFacebook,
    linkedin: IconBrandLinkedin,
    tiktok: IconBrandTiktok,
    youtube: IconBrandYoutube,
    twitter: IconBrandX,
};

export type BusinessPublicContactForm = {
    publicEmail: string;
    publicPhone: string;
    publicWhatsapp: string;
    websiteUrl: string;
};

export type BusinessPublicContactCardProps = {
    form: BusinessPublicContactForm;
    onFormChange: (key: keyof BusinessPublicContactForm, value: string) => void;
    socialLinks?: BusinessSocialLink[];
    onSocialLinksChange?: (links: BusinessSocialLink[]) => void;
    disabled?: boolean;
    showEmail?: boolean;
    showWebsite?: boolean;
    showSocial?: boolean;
    /** Reinicia el enlace teléfono/WhatsApp al recargar datos (p. ej. id del perfil). */
    contactResetKey?: string;
};

function digitsOnly(value: string) {
    return value.replace(/\D/g, '');
}

function inferWhatsappLinkedToPhone(phone: string, whatsapp: string) {
    const normalizedPhone = phone.trim();
    const normalizedWhatsapp = whatsapp.trim();
    if (!normalizedWhatsapp) return true;
    if (!normalizedPhone) return false;
    return digitsOnly(normalizedPhone) === digitsOnly(normalizedWhatsapp);
}

export function BusinessPublicContactCard({
    form,
    onFormChange,
    socialLinks,
    onSocialLinksChange,
    disabled = false,
    showEmail = true,
    showWebsite = true,
    showSocial = true,
    contactResetKey,
}: BusinessPublicContactCardProps) {
    const [showPlatformPicker, setShowPlatformPicker] = useState(false);
    const [whatsappLinked, setWhatsappLinked] = useState(() => inferWhatsappLinkedToPhone(form.publicPhone, form.publicWhatsapp));
    const pickerRef = useRef<HTMLDivElement>(null);
    const socialEnabled = showSocial && socialLinks !== undefined && onSocialLinksChange !== undefined;

    useEffect(() => {
        setWhatsappLinked(inferWhatsappLinkedToPhone(form.publicPhone, form.publicWhatsapp));
    }, [contactResetKey]);

    const handlePhoneChange = (value: string) => {
        onFormChange('publicPhone', value);
        if (whatsappLinked) onFormChange('publicWhatsapp', value);
    };

    const toggleWhatsappLinked = () => {
        const next = !whatsappLinked;
        setWhatsappLinked(next);
        if (next) onFormChange('publicWhatsapp', form.publicPhone);
    };

    const whatsappLinkLabel = whatsappLinked
        ? 'WhatsApp usa el mismo número que teléfono. Pulsa para usar otro número.'
        : 'WhatsApp con número distinto. Pulsa para usar el mismo que teléfono.';

    return (
        <PanelCard size="lg" className="space-y-5">
            <PanelBlockHeader
                title={BUSINESS_PUBLIC_CONTACT_SECTION.title}
                description={BUSINESS_PUBLIC_CONTACT_SECTION.description}
                className="mb-0"
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <PanelField label="Teléfono">
                    <input
                        type="tel"
                        value={form.publicPhone}
                        onChange={(event) => handlePhoneChange(event.target.value)}
                        placeholder="+56 2 1234 5678"
                        className="form-input"
                        disabled={disabled}
                    />
                </PanelField>
                <PanelField label="WhatsApp">
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            value={whatsappLinked ? form.publicPhone : form.publicWhatsapp}
                            onChange={(event) => onFormChange('publicWhatsapp', event.target.value)}
                            placeholder="+56 9 1234 5678"
                            className={`form-input min-w-0 flex-1 ${whatsappLinked ? 'text-fg-muted' : ''}`}
                            disabled={disabled || whatsappLinked}
                            aria-label={whatsappLinked ? 'WhatsApp (mismo número que teléfono)' : 'WhatsApp'}
                        />
                        <PanelIconButton
                            type="button"
                            label={whatsappLinkLabel}
                            onClick={toggleWhatsappLinked}
                            variant={whatsappLinked ? 'soft' : 'ghost'}
                            size="md"
                            disabled={disabled}
                            className={`h-[42px] w-[42px] shrink-0 ${
                                whatsappLinked ? 'text-accent ring-1 ring-accent/25' : 'text-fg-muted hover:text-fg'
                            }`}
                        >
                            {whatsappLinked ? <IconLink size={18} stroke={2} /> : <IconLinkOff size={18} stroke={1.75} />}
                        </PanelIconButton>
                    </div>
                </PanelField>
                {whatsappLinked ? (
                    <p className="text-xs text-fg-muted sm:col-span-2">
                        {BUSINESS_PUBLIC_WHATSAPP_LINKED_HINT}
                    </p>
                ) : null}
                {showEmail ? (
                    <PanelField label="Email público">
                        <input
                            type="email"
                            value={form.publicEmail}
                            onChange={(event) => onFormChange('publicEmail', event.target.value)}
                            placeholder="contacto@ejemplo.cl"
                            className="form-input"
                            disabled={disabled}
                        />
                    </PanelField>
                ) : null}
                {showWebsite ? (
                    <PanelField label="Sitio web">
                        <div className="flex items-center overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                            <span
                                className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRight: '1px solid var(--border)' }}
                            >
                                <IconWorld size={13} /> https://
                            </span>
                            <input
                                type="text"
                                value={form.websiteUrl.replace(/^https?:\/\//, '')}
                                onChange={(event) => onFormChange('websiteUrl', event.target.value ? `https://${event.target.value}` : '')}
                                placeholder="tuweb.cl"
                                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                                style={{ color: 'var(--fg)' }}
                                disabled={disabled}
                            />
                        </div>
                    </PanelField>
                ) : null}
            </div>

            {socialEnabled ? (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>Redes sociales</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {socialLinks.map((link, idx) => {
                            const info = BUSINESS_SOCIAL_PLATFORM_META[link.platform];
                            const Icon = BUSINESS_SOCIAL_PLATFORM_ICONS[link.platform];
                            return (
                                <div key={idx} className="flex items-center gap-2">
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                    >
                                        <Icon size={15} />
                                    </div>
                                    <div className="flex flex-1 items-center overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                                        <span
                                            className="shrink-0 whitespace-nowrap px-2.5 py-2 text-[11px]"
                                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRight: '1px solid var(--border)' }}
                                        >
                                            {info.shortBase}
                                        </span>
                                        <input
                                            type="text"
                                            value={link.username}
                                            onChange={(event) => onSocialLinksChange(
                                                socialLinks.map((item, index) => (
                                                    index === idx ? { ...item, username: event.target.value } : item
                                                )),
                                            )}
                                            placeholder={info.placeholder}
                                            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                                            style={{ color: 'var(--fg)' }}
                                            disabled={disabled}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSocialLinksChange(socialLinks.filter((_, index) => index !== idx))}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-400"
                                        style={{ color: 'var(--fg-muted)' }}
                                        aria-label="Eliminar"
                                        disabled={disabled}
                                    >
                                        <IconX size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="relative mt-3" ref={pickerRef}>
                        {(() => {
                            const usedPlatforms = new Set(socialLinks.map((link) => link.platform));
                            const available = ALL_BUSINESS_SOCIAL_PLATFORMS.filter((platform) => !usedPlatforms.has(platform));
                            if (available.length === 0) return null;
                            return (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowPlatformPicker((value) => !value)}
                                        className="form-input inline-flex h-[42px] w-auto items-center gap-1.5 px-3 text-xs font-medium"
                                        style={{ color: 'var(--fg-secondary)' }}
                                        disabled={disabled}
                                    >
                                        Agregar red social <IconChevronDown size={14} style={{ color: 'var(--fg-muted)' }} />
                                    </button>
                                    {showPlatformPicker ? (
                                        <div
                                            className={`absolute left-0 mt-1.5 min-w-[200px] ${PANEL_DROPDOWN_POPOVER_CLASS}`}
                                            style={{ ...PANEL_DROPDOWN_POPOVER_STYLE, zIndex: FLOATING_POPOVER_Z_INDEX }}
                                        >
                                            {available.map((platform) => {
                                                const info = BUSINESS_SOCIAL_PLATFORM_META[platform];
                                                const PlatformIcon = BUSINESS_SOCIAL_PLATFORM_ICONS[platform];
                                                return (
                                                    <button
                                                        key={platform}
                                                        type="button"
                                                        onClick={() => {
                                                            onSocialLinksChange([...socialLinks, { platform, username: '' }]);
                                                            setShowPlatformPicker(false);
                                                        }}
                                                        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-(--bg-muted)"
                                                        style={panelDropdownItemStyle()}
                                                        disabled={disabled}
                                                    >
                                                        <PlatformIcon size={15} style={{ color: 'var(--fg-muted)' }} />
                                                        {info.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </>
                            );
                        })()}
                    </div>
                </div>
            ) : null}
        </PanelCard>
    );
}
