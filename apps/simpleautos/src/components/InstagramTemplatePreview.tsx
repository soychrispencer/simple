'use client';

import React from 'react';
import { InstagramTemplateView } from '@simple/api/src/instagram-templates';

interface InstagramTemplatePreviewProps {
    className?: string;
    imageUrl: string | null;
    template: InstagramTemplateView | null;
    layoutVariant: 'square' | 'portrait';
    fallback?: React.ReactNode;
    children?: React.ReactNode;
}

export const InstagramTemplatePreview: React.FC<InstagramTemplatePreviewProps> = ({
    className,
    imageUrl,
    template,
    layoutVariant,
    fallback,
    children
}) => {
    const aspectRatio = layoutVariant === 'portrait' ? 'aspect-[4/5]' : 'aspect-square';
    
    // Debug log
    if (template) {
        console.log('[InstagramTemplatePreview] Rendering with template:', {
            id: template.id,
            overlayVariant: template.overlayVariant,
            name: template.name
        });
    }

    if (!imageUrl) {
        return (
            <div className={`${className} ${aspectRatio} flex items-center justify-center rounded-lg border-2 border-dashed`} style={{ borderColor: 'var(--border)' }}>
                {fallback}
            </div>
        );
    }

    const renderTemplateOverlay = () => {
        if (!template) return null;

        switch (template.overlayVariant) {
            case 'essential-watermark':
                return <EssentialOverlay template={template} />;
            case 'professional-centered':
                return <ProfessionalOverlay template={template} />;
            case 'signature-complete':
                return <SignatureOverlay template={template} />;
            default:
                return null;
        }
    };

    return (
        <div className={`${className} ${aspectRatio} relative overflow-hidden rounded-lg bg-gray-100`}>
            <img
                src={imageUrl}
                alt="Instagram preview"
                className="w-full h-full object-cover"
            />
            {renderTemplateOverlay()}
            {children}
        </div>
    );
};

// ESSENTIAL: Mínimo - solo precio y marca de agua sutil
const EssentialOverlay: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 flex flex-col justify-between p-4">
            {/* Top: Highlights si existen */}
            {template.highlights && template.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {template.highlights.slice(0, 2).map((h, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black/40 text-white text-[9px] rounded">
                            {h}
                        </span>
                    ))}
                </div>
            )}

            {/* Bottom: Precio centrado */}
            <div className="text-center">
                <div className="text-xl font-bold text-white drop-shadow-lg">
                    {template.priceLabel}
                </div>
                {template.subtitle && (
                    <div className="text-xs text-white/80 mt-0.5">
                        {template.subtitle}
                    </div>
                )}
            </div>

            {/* Watermark sutil */}
            <div className="absolute bottom-3 right-3 text-[8px] text-white/40">
                {template.branding.appName}
            </div>
        </div>
    );
};

// PROFESSIONAL: Balanceado - info centrada en card blanca
const ProfessionalOverlay: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 flex flex-col justify-end p-4">
            {/* Card blanca en la parte inferior */}
            <div className="bg-white/95 rounded-xl p-3 shadow-lg">
                {/* Año arriba */}
                {template.eyebrow && (
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                        {template.eyebrow}
                    </div>
                )}
                
                {/* Precio grande */}
                <div className="text-xl font-bold text-gray-900 mt-0.5">
                    {template.priceLabel}
                </div>
                
                {/* Título */}
                <div className="text-sm font-medium text-gray-700 mt-0.5 line-clamp-1">
                    {template.title}
                </div>
                
                {/* Detalles */}
                {template.subtitle && (
                    <div className="text-xs text-gray-500 mt-1">
                        {template.subtitle}
                    </div>
                )}

                {/* CTA */}
                {template.ctaLabel && (
                    <div className="mt-2 text-xs font-semibold" style={{ color: template.colors.accent }}>
                        {template.ctaLabel}
                    </div>
                )}
            </div>
        </div>
    );
};

// SIGNATURE: Premium - info completa con estilo
const SignatureOverlay: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 flex flex-col justify-between p-4">
            {/* Header con eyebrow */}
            {template.eyebrow && (
                <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-black/60 text-white text-xs rounded">
                        {template.eyebrow}
                    </span>
                    <span className="text-[9px] text-white/60">{template.branding.appName}</span>
                </div>
            )}

            {/* Info en card oscura semi-transparente */}
            <div className="bg-black/70 rounded-xl p-3 text-white">
                {/* Precio */}
                <div className="text-2xl font-bold">
                    {template.priceLabel}
                </div>
                
                {/* Título */}
                <div className="text-sm font-medium mt-1 line-clamp-1">
                    {template.title}
                </div>
                
                {/* Detalles */}
                {template.subtitle && (
                    <div className="text-xs text-white/70 mt-1">
                        {template.subtitle}
                    </div>
                )}

                {/* Highlights en row */}
                {template.highlights && template.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {template.highlights.slice(0, 3).map((h, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded">
                                {h}
                            </span>
                        ))}
                    </div>
                )}

                {/* CTA */}
                {template.ctaLabel && (
                    <div className="mt-2 text-xs font-semibold" style={{ color: template.colors.accent }}>
                        {template.ctaLabel}
                    </div>
                )}
            </div>
        </div>
    );
};
