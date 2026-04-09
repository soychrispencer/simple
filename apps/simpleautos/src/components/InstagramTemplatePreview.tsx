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
            case 'essential-watermark':
                return <EssentialWatermark template={template} />;
            case 'professional-centered':
                return <ProfessionalCentered template={template} />;
            case 'signature-complete':
                return <SignatureComplete template={template} />;
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

// Template 1: ESSENTIAL - Marca de agua mínima, el vehículo es el protagonista
const EssentialWatermark: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0">
            {/* Overlay muy sutil solo en la parte inferior para el precio */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-20 pb-6">
                <div className="px-6">
                    {/* Año en pequeño */}
                    {template.eyebrow && (
                        <span className="text-xs text-white/70 tracking-wider">
                            {template.eyebrow}
                        </span>
                    )}
                    
                    {/* Precio destacado */}
                    <div className="text-2xl font-bold text-white mt-1">
                        {template.priceLabel}
                    </div>
                    
                    {/* Marca/Modelo sutil */}
                    {template.subtitle && (
                        <p className="text-sm text-white/80 mt-1">
                            {template.subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Marca de agua SimpleAutos - esquina inferior derecha, muy sutil */}
            <div className="absolute bottom-4 right-4 opacity-30">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-white/50 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-black">S</span>
                    </div>
                    <span className="text-[10px] text-white font-medium">
                        {template.branding.appName}
                    </span>
                </div>
            </div>

            {/* 1-2 highlights máximo, solo si hay espacio */}
            {template.highlights && template.highlights.length > 0 && (
                <div className="absolute top-4 left-4 flex flex-col gap-1">
                    {template.highlights.slice(0, 2).map((highlight, idx) => (
                        <span 
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] bg-white/20 text-white backdrop-blur-sm"
                        >
                            {highlight}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// Template 2: PROFESSIONAL - Información centrada, balance perfecto
const ProfessionalCentered: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60">
            {/* Header sutil con marca/modelo */}
            {template.eyebrow && (
                <div className="absolute top-0 left-0 right-0 p-5">
                    <div className="flex items-center justify-center">
                        <span 
                            className="px-3 py-1 rounded-full text-xs font-medium tracking-wide"
                            style={{ 
                                backgroundColor: `${template.colors.primary}20`,
                                color: template.colors.textInverse,
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            {template.eyebrow}
                        </span>
                    </div>
                </div>
            )}

            {/* Contenido centrado en la parte inferior */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center">
                {/* Precio destacado arriba */}
                <div 
                    className="text-3xl font-black mb-2"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.priceLabel}
                </div>

                {/* Título */}
                <h2 
                    className="text-lg font-semibold text-center mb-2 leading-tight max-w-[90%]"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.title}
                </h2>

                {/* Subtítulo (condición • km) */}
                {template.subtitle && (
                    <p 
                        className="text-sm text-center mb-3 opacity-90"
                        style={{ color: template.colors.textInverse }}
                    >
                        {template.subtitle}
                    </p>
                )}

                {/* CTA */}
                {template.ctaLabel && (
                    <button 
                        className="px-5 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
                        style={{ 
                            backgroundColor: template.colors.textInverse,
                            color: template.colors.primary
                        }}
                    >
                        {template.ctaLabel}
                    </button>
                )}

                {/* Features destacados (hasta 3) */}
                {template.highlights && template.highlights.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                        {template.highlights.slice(0, 3).map((highlight, idx) => (
                            <span 
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] bg-white/20 text-white"
                            >
                                {highlight}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Logo SimpleAutos sutil en esquina */}
            <div className="absolute top-4 right-4 opacity-20">
                <span className="text-[10px] text-white font-medium">
                    {template.branding.appName}
                </span>
            </div>
        </div>
    );
};

// Template 3: SIGNATURE - Diseño completo premium
const SignatureComplete: React.FC<{ template: InstagramTemplateView }> = ({ template }) => {
    return (
        <div className="absolute inset-0">
            {/* Header con branding */}
            <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                    {/* Eyebrow / Marca del vehículo */}
                    <div 
                        className="px-3 py-1.5 rounded text-xs font-semibold tracking-wide"
                        style={{ 
                            backgroundColor: template.colors.accent,
                            color: template.colors.primary
                        }}
                    >
                        {template.eyebrow}
                    </div>

                    {/* Logo SimpleAutos sutil */}
                    <div className="flex items-center gap-1.5 opacity-60">
                        <div className="w-5 h-5 rounded bg-white/90 flex items-center justify-center">
                            <span className="text-[10px] font-bold" style={{ color: template.colors.primary }}>S</span>
                        </div>
                        <span className="text-xs text-white font-medium">
                            {template.branding.appName}
                        </span>
                    </div>
                </div>
            </div>

            {/* Contenido principal centrado */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                {/* Precio grande */}
                <div 
                    className="text-4xl font-black mb-3"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.priceLabel}
                </div>

                {/* Título */}
                <h2 
                    className="text-xl font-bold text-center mb-2 leading-tight max-w-[85%]"
                    style={{ color: template.colors.textInverse }}
                >
                    {template.title}
                </h2>

                {/* Detalles del vehículo (año • condición • km • combustible) */}
                {template.subtitle && (
                    <p 
                        className="text-sm text-center mb-4 opacity-90"
                        style={{ color: template.colors.textInverse }}
                    >
                        {template.subtitle}
                    </p>
                )}

                {/* Features en badges */}
                {template.highlights && template.highlights.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-[90%]">
                        {template.highlights.map((highlight, idx) => (
                            <span 
                                key={idx}
                                className="px-2.5 py-1 rounded-full text-[10px] bg-white/20 text-white border border-white/30"
                            >
                                {highlight}
                            </span>
                        ))}
                    </div>
                )}

                {/* CTA */}
                {template.ctaLabel && (
                    <button 
                        className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                        style={{ 
                            backgroundColor: template.colors.accent,
                            color: template.colors.primary
                        }}
                    >
                        {template.ctaLabel}
                    </button>
                )}
            </div>

            {/* Footer con ubicación si existe */}
            {template.locationLabel && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex items-center justify-center gap-1 text-white/70 text-xs">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {template.locationLabel}
                    </div>
                </div>
            )}
        </div>
    );
};
