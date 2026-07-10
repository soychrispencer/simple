'use client';

import { useState } from 'react';
import { IconHome2 } from '@tabler/icons-react';
import { getSimpleAppBrand } from '@simple/config';
import { PanelButton } from '../panel/panel-button';
import { PanelScrollModal } from '../panel/panel-scroll-modal';
import {
    InstagramTemplatePreview,
    type InstagramTemplatePreviewData,
} from './instagram-template-preview';

export type InstagramPublishTemplateOption = InstagramTemplatePreviewData & {
    id: string;
    name: string;
    score: number;
};

export type InstagramPublishPersonalizeModalProps = {
    open: boolean;
    onClose: () => void;
    brandLabel: string;
    images: string[];
    templates: InstagramPublishTemplateOption[];
    templatesLoading: boolean;
    selectedTemplateId: string | null;
    onSelectTemplate: (templateId: string) => void;
    caption: string;
    onCaptionChange: (value: string) => void;
    saving: boolean;
    onSave: () => void | Promise<void>;
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
    'essential-watermark': 'Solo marca de agua',
    'professional-centered': 'Ficha reel centrada',
    'signature-complete': 'Editorial con precio destacado',
};

export function InstagramPublishPersonalizeModal({
    open,
    onClose,
    brandLabel,
    images,
    templates,
    templatesLoading,
    selectedTemplateId,
    onSelectTemplate,
    caption,
    onCaptionChange,
    saving,
    onSave,
}: InstagramPublishPersonalizeModalProps) {
    const [carouselIndex, setCarouselIndex] = useState(0);
    const activeTemplate = templates.find((template) => template.id === selectedTemplateId)
        ?? templates[0]
        ?? null;
    const previewTemplate = carouselIndex === 0 || !activeTemplate
        ? activeTemplate
        : {
            ...activeTemplate,
            overlayVariant: 'essential-watermark',
            eyebrow: '',
            title: '',
            headline: '',
            subtitle: undefined,
            priceLabel: '',
            offerPriceLabel: undefined,
            discountLabel: undefined,
            locationLabel: '',
            highlights: [],
            badges: [],
            ctaLabel: '',
        };
    const previewImage = images[carouselIndex] ?? images[0] ?? null;
    const brandAccent = getSimpleAppBrand(
        brandLabel.toLowerCase().includes('propiedad') ? 'simplepropiedades' : 'simpleautos',
    ).accentLight;

    if (!open) return null;

    return (
        <PanelScrollModal
            open
            title="Personalizar publicación en Instagram"
            onClose={onClose}
            size="6xl"
            height="tall"
            zIndexClass="z-[120]"
            overlayClassName="bg-black/70 backdrop-blur-sm"
            bodyClassName="flex flex-col p-4 md:p-6"
            footer={(
                <div className="flex flex-col gap-3 sm:ml-auto sm:max-w-md sm:flex-row">
                    <PanelButton variant="secondary" className="flex-1" onClick={onClose}>
                        Cancelar
                    </PanelButton>
                    <PanelButton
                        variant="primary"
                        className="flex-1"
                        disabled={saving || templatesLoading || !activeTemplate}
                        onClick={() => void onSave()}
                    >
                        {saving ? 'Guardando...' : 'Guardar estilo'}
                    </PanelButton>
                </div>
            )}
        >
            <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:gap-8">
                <div className="flex w-full flex-col gap-3 md:w-1/2">
                    <InstagramTemplatePreview
                        className="group mx-auto w-full max-w-[420px]"
                        imageUrl={previewImage}
                        template={previewTemplate}
                        layoutVariant={activeTemplate?.layoutVariant ?? 'portrait'}
                        fallback={<IconHome2 size={48} />}
                    >
                        {images.length > 1 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setCarouselIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCarouselIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-opacity hover:bg-black/70"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                                <div className="absolute right-0 bottom-4 left-0 flex justify-center gap-1.5">
                                    {images.map((_, index) => (
                                        <div
                                            key={`slide-${index}`}
                                            className={`h-1.5 rounded-full transition-all ${index === carouselIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </InstagramTemplatePreview>
                    <p className="text-center text-[11px] text-(--fg-muted)">
                        La portada usa tu diseño; las demás fotos llevan solo marca de agua.
                    </p>
                </div>

                <div className="flex min-h-0 w-full flex-1 flex-col md:w-1/2">
                    <div className="mb-4 rounded-[1.25rem] border border-(--border) bg-(--surface) p-4">
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-(--fg)">Diseño de {brandLabel}</div>
                            <div className="text-[11px] text-(--fg-secondary)">
                                {templatesLoading
                                    ? 'Cargando plantillas...'
                                    : activeTemplate
                                        ? `3:4 · ${activeTemplate.score}/100`
                                        : 'Sin plantilla'}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {templates.map((template) => {
                                const selected = template.id === activeTemplate?.id;
                                return (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => onSelectTemplate(template.id)}
                                        className="rounded-xl border px-3 py-2.5 text-left transition-all"
                                        style={{
                                            borderColor: selected ? brandAccent : 'var(--border)',
                                            background: selected ? `color-mix(in oklab, ${brandAccent} 10%, var(--surface))` : 'var(--surface)',
                                            boxShadow: selected ? `0 0 0 1px color-mix(in oklab, ${brandAccent} 35%, transparent)` : undefined,
                                        }}
                                    >
                                        <div className="text-sm font-semibold text-(--fg)">{template.name}</div>
                                        <div className="mt-0.5 text-[11px] leading-snug text-(--fg-muted)">
                                            {TEMPLATE_DESCRIPTIONS[template.id] ?? 'Diseño personalizado'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-2 flex shrink-0 items-center justify-between">
                        <label className="text-xs font-semibold tracking-wider text-(--fg-muted) uppercase">
                            Pie de foto
                        </label>
                        <span className="text-[10px] text-(--fg-muted) opacity-70">
                            {caption.length} / 2200
                        </span>
                    </div>
                    <textarea
                        value={caption}
                        onChange={(event) => onCaptionChange(event.target.value)}
                        className="mb-2 min-h-[180px] w-full flex-1 resize-none rounded-xl border border-(--border) bg-(--surface-sunken) p-4 text-sm text-(--fg) focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Escribe el pie de foto que quieres reutilizar..."
                    />
                    <p className="text-[11px] leading-snug text-(--fg-muted)">
                        Este estilo se guarda en tu cuenta. Después solo toca Publicar y usaremos tu diseño y pie de foto.
                    </p>
                </div>
            </div>
        </PanelScrollModal>
    );
}
