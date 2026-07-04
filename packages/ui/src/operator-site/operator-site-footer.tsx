'use client';

import Link from 'next/link';
import { socialIcon } from './operator-site-icons.js';
import type { OperatorSiteLayout, OperatorSiteSocialLink } from './types.js';

type OperatorSiteFooterProps = {
    brandName: string;
    brandHref: string;
    displayName: string;
    socialLinks: OperatorSiteSocialLink[];
    layout: OperatorSiteLayout;
    navItems?: Array<{ id: string; label: string }>;
};

export function OperatorSiteFooter({
    brandName,
    brandHref,
    displayName,
    socialLinks,
    layout,
    navItems = [],
}: OperatorSiteFooterProps) {
    if (layout === 'portfolio') {
        return (
            <footer className="os-footer os-footer--editorial">
                <div className="os-footer__inner">
                    <p className="os-footer__brand">{displayName}</p>
                    {socialLinks.length > 0 ? (
                        <div className="os-social-row os-social-row--center">
                            {socialLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="os-social-chip"
                                    title={link.label}
                                    aria-label={link.label}
                                >
                                    {socialIcon(link.kind, 16)}
                                </a>
                            ))}
                        </div>
                    ) : null}
                    <p className="os-footer__copy">
                        Página profesional con{' '}
                        <Link href={brandHref} target="_blank" rel="noopener noreferrer">{brandName}</Link>
                    </p>
                </div>
            </footer>
        );
    }

    if (layout === 'studio') {
        return (
            <footer className="os-footer os-footer--corporate">
                <div className="os-footer__inner">
                    <div className="os-footer__grid">
                        <div>
                            <p className="os-footer__brand">{displayName}</p>
                            <p className="os-footer__copy-sm">
                                Página profesional con{' '}
                                <Link href={brandHref} target="_blank" rel="noopener noreferrer">{brandName}</Link>
                            </p>
                        </div>
                        {navItems.length > 0 ? (
                            <nav className="os-footer__nav" aria-label="Pie de página">
                                {navItems.map((item) => (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className="os-footer__link"
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                        ) : null}
                        {socialLinks.length > 0 ? (
                            <div className="os-social-row">
                                {socialLinks.map((link) => (
                                    <a
                                        key={link.label}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="os-social-chip"
                                        title={link.label}
                                        aria-label={link.label}
                                    >
                                        {socialIcon(link.kind, 16)}
                                    </a>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </footer>
        );
    }

    // Booking (default)
    return (
        <footer className="os-footer">
            <div className="os-footer__inner">
                <p className="os-footer__copy">
                    Página profesional con{' '}
                    <Link href={brandHref} target="_blank" rel="noopener noreferrer">{brandName}</Link>
                </p>
            </div>
        </footer>
    );
}
