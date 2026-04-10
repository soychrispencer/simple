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

    // Renderizar overlay según el tipo de template
    const renderOverlay = () => {
        // DEBUG: Siempre renderizar algo para confirmar que el componente funciona
        if (!template) {
            return (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'red',
                    color: 'white',
                    padding: '20px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    zIndex: 9999,
                }}>
                    NO TEMPLATE
                </div>
            );
        }

        const variant = template.overlayVariant;

        // DEBUG: Mostrar el variant que se recibió
        console.log('[InstagramTemplatePreview] Rendering variant:', variant, 'Template ID:', template.id);

        // ESSENTIAL: Solo precio centrado abajo
        if (variant === 'essential-watermark') {
            return (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '80px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '16px',
                    border: '2px solid red', // DEBUG: Confirmar que se renderiza
                }}>
                    <div style={{
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: 700,
                        textAlign: 'center',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}>
                        {template.priceLabel}
                    </div>
                    {template.subtitle && (
                        <div style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '12px',
                            textAlign: 'center',
                            marginTop: '4px',
                        }}>
                            {template.subtitle}
                        </div>
                    )}
                </div>
            );
        }

        // PROFESSIONAL: Card blanca en la parte inferior
        if (variant === 'professional-centered') {
            return (
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '12px',
                    padding: '12px',
                }}>
                    {template.eyebrow && (
                        <div style={{
                            fontSize: '10px',
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            {template.eyebrow}
                        </div>
                    )}
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#111',
                        marginTop: '2px',
                    }}>
                        {template.priceLabel}
                    </div>
                    <div style={{
                        fontSize: '14px',
                        color: '#333',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {template.title}
                    </div>
                    {template.subtitle && (
                        <div style={{
                            fontSize: '11px',
                            color: '#666',
                            marginTop: '4px',
                        }}>
                            {template.subtitle}
                        </div>
                    )}
                </div>
            );
        }

        // SIGNATURE: Card oscura con eyebrow arriba
        if (variant === 'signature-complete') {
            return (
                <>
                    {/* Eyebrow arriba */}
                    {template.eyebrow && (
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                        }}>
                            {template.eyebrow}
                        </div>
                    )}
                    {/* Card oscura abajo */}
                    <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'rgba(0,0,0,0.7)',
                        borderRadius: '12px',
                        padding: '12px',
                        color: 'white',
                    }}>
                        <div style={{
                            fontSize: '28px',
                            fontWeight: 700,
                        }}>
                            {template.priceLabel}
                        </div>
                        <div style={{
                            fontSize: '14px',
                            marginTop: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {template.title}
                        </div>
                        {template.subtitle && (
                            <div style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.7)',
                                marginTop: '4px',
                            }}>
                                {template.subtitle}
                            </div>
                        )}
                    </div>
                </>
            );
        }

        return null;
    };

    return (
        <div 
            className={`${className} ${aspectRatio} overflow-hidden rounded-lg bg-gray-100`}
            style={{ position: 'relative' }}
        >
            <img
                src={imageUrl}
                alt="Instagram preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {renderOverlay()}
            {children}
        </div>
    );
};
