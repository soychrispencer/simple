'use client';

import { OperatorSiteReveal } from './operator-site-reveal.js';

export function OperatorSiteAboutSection({
    bio,
    variant = 'standard',
}: {
    bio: string;
    variant?: 'standard' | 'editorial';
}) {
    if (variant === 'editorial') {
        return (
            <OperatorSiteReveal>
                <section id="sobre-mi" className="os-section os-section--editorial">
                    <div className="os-section__inner">
                        <div className="os-about-editorial">
                            <p className="os-about-editorial__label">Sobre mí</p>
                            <blockquote className="os-about-editorial__quote">{bio}</blockquote>
                        </div>
                    </div>
                </section>
            </OperatorSiteReveal>
        );
    }

    return (
        <OperatorSiteReveal>
            <section id="sobre-mi" className="os-section">
                <div className="os-section__inner">
                    <p className="os-section__label">Sobre mí</p>
                    <h2 className="os-section__title">Conoce mi enfoque</h2>
                    <div className="os-glass os-about">{bio}</div>
                </div>
            </section>
        </OperatorSiteReveal>
    );
}
