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
            case 'minimalista-centrado':
                return <MinimalistaCentrado template={template} />;
            case 'premium-corporativo':
                return <PremiumCorporativo template={template} />;
            case 'dinamico-moderno':
                return <DinamicoModerno template={template} />;
            default:
                return null;
        }
    };

    return (
        <div className={`${className} ${aspectRatio} relative overflow-hidden rounded-lg`}>
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

// Template 1: Minimalista Centrado
const MinimalistaCentrado: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            {/* Badge superior */}
            <div className="absolute top-4 left-4">
                <div 
                    className="px-3 py-1 rounded-full text-xs font-bold tracking-wider"
                    style={{ 
                        backgroundColor: template.colors.textInverse,
                        color: template.colors.textPrimary 
                    }}
                >
                    {template.eyebrow}
                </div>
            </div>

            {/* Logo en esquina */}
            <div className="absolute top-4 right-4">
                <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                        backgroundColor: template.colors.textInverse,
                        color: template.colors.textPrimary 
                    }}
                >
                    {template.branding.badgeText}
                </div>
            </div>

            {/* Contenido centrado */}
            <div className="text-center px-8">
                <h2 
                    className="text-2xl font-bold mb-2 leading-tight"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.title}
                </h2>
                {template.subtitle && (
                    <p 
                        className="text-sm mb-3 opacity-90"
                        style={{ color: template.colors.textInverse }}
                    >
                        {template.subtitle}
                    </p>
                )}
                <div 
                    className="text-xl font-bold mb-4"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.priceLabel}
                </div>
                <button 
                    className="px-6 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    style={{ 
                        backgroundColor: template.colors.textInverse,
                        color: template.colors.textPrimary 
                    }}
                >
                    {template.ctaLabel}
                </button>
            </div>
        </div>
    );
};

// Template 2: Premium Corporativo
const PremiumCorporativo: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60">
            {/* Barra superior */}
            <div className="absolute top-0 left-0 right-0 p-4">
                <div className="flex items-center justify-between">
                    <div 
                        className="px-3 py-1 rounded text-xs font-bold tracking-wider"
                        style={{ 
                            backgroundColor: template.colors.accent,
                            color: template.colors.textInverse 
                        }}
                    >
                        {template.eyebrow}
                    </div>
                    <div 
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ 
                            backgroundColor: template.colors.surface,
                            color: template.colors.textPrimary 
                        }}
                    >
                        {template.branding.badgeText}
                    </div>
                </div>
            </div>

            {/* Contenido alineado a la izquierda */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="max-w-[80%]">
                    <h2 
                        className="text-2xl font-bold mb-2 leading-tight"
                        style={{ color: template.colors.textInverse }}
                    >
                        {template.title}
                    </h2>
                    {template.subtitle && (
                        <p 
                            className="text-sm mb-3 opacity-90"
                            style={{ color: template.colors.textSecondary }}
                        >
                            {template.subtitle}
                        </p>
                    )}
                    <div className="flex items-center gap-4">
                        <div 
                            className="text-xl font-bold"
                            style={{ color: template.colors.textInverse }}
                        >
                            {template.priceLabel}
                        </div>
                        <button 
                            className="px-4 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                            style={{ 
                                backgroundColor: template.colors.accent,
                                color: template.colors.textInverse 
                            }}
                        >
                            {template.ctaLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Template 3: Dinámico Moderno
const DinamicoModerno: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/30 to-transparent">
            {/* Elementos decorativos flotantes */}
            <div className="absolute top-6 right-6 w-16 h-16 rounded-full opacity-60"
                style={{ 
                    background: `linear-gradient(135deg, ${template.colors.accent}, ${template.colors.secondary})` 
                }}
            />
            <div className="absolute bottom-20 left-6 w-12 h-12 rounded-full opacity-40"
                style={{ 
                    background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.accent})` 
                }}
            />

            {/* Badge diagonal */}
            <div className="absolute top-6 left-6">
                <div 
                    className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider transform -rotate-3"
                    style={{ 
                        background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.accent})`,
                        color: template.colors.textInverse 
                    }}
                >
                    {template.eyebrow}
                </div>
            </div>

            {/* Contenido centrado con estilo dinámico */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                <div className="text-center">
                    <h2 
                        className="text-3xl font-black mb-2 leading-tight tracking-tight"
                        style={{ 
                            color: template.colors.textInverse,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                        }}
                    >
                        {template.title}
                    </h2>
                    {template.subtitle && (
                        <p 
                            className="text-sm mb-4 opacity-95 font-medium"
                            style={{ color: template.colors.textInverse }}
                        >
                            {template.subtitle}
                        </p>
                    )}
                    <div 
                        className="text-2xl font-black mb-4"
                        style={{ 
                            color: template.colors.textInverse,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                        }}
                    >
                        {template.priceLabel}
                    </div>
                    <button 
                        className="px-8 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 hover:shadow-lg"
                        style={{ 
                            background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.accent})`,
                            color: template.colors.textInverse 
                        }}
                    >
                        {template.ctaLabel}
                    </button>
                </div>
            </div>

            {/* Logo en esquina inferior */}
            <div className="absolute bottom-4 right-4">
                <div 
                    className="px-2 py-1 rounded text-xs font-bold"
                    style={{ 
                        backgroundColor: template.colors.textInverse + '90',
                        color: template.colors.primary 
                    }}
                >
                    {template.branding.badgeText}
                </div>
            </div>
        </div>
    );
};
