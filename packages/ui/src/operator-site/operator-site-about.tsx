'use client';

import { OperatorSiteReveal, type OperatorSiteRevealVariant } from './operator-site-reveal.js';

export function OperatorSiteAboutSection({
    bio,
    title = 'Conoce mi enfoque',
    variant = 'standard',
    revealVariant = 'fade-up',
}: {
    bio: string;
    title?: string;
    variant?: 'standard' | 'editorial';
    revealVariant?: OperatorSiteRevealVariant;
}) {
    if (variant === 'editorial') {
        return (
            <OperatorSiteReveal variant={revealVariant}>
                <section id="sobre-mi" className="os-section os-section--editorial">
                    <div className="os-section__inner">
                        <div className="os-about-editorial">
                            <p className="os-about-editorial__label">Sobre mí</p>
                            <h2 className="os-section__title">{title}</h2>
                            <blockquote className="os-about-editorial__quote">{bio}</blockquote>
                        </div>
                    </div>
                </section>
            </OperatorSiteReveal>
        );
    }

    return (
        <OperatorSiteReveal variant={revealVariant}>
            <section id="sobre-mi" className="os-section">
                <div className="os-section__inner">
                    <p className="os-section__label">Sobre mí</p>
                    <h2 className="os-section__title">{title}</h2>
                    <div className="os-glass os-about">{bio}</div>
                </div>
            </section>
        </OperatorSiteReveal>
    );
}
