'use client';

import Link from 'next/link';
import { IconBrandInstagram, IconBrandWhatsapp, IconMail } from '@tabler/icons-react';
import { type ReactNode } from 'react';

export type MarketplaceFooterLink = { label: string; href: string };

export type MarketplaceFooterSection = {
    title: string;
    links: MarketplaceFooterLink[];
};

export type MarketplaceFooterProps = {
    logo: ReactNode;
    description: string;
    copyrightName: string;
    sections?: MarketplaceFooterSection[];
    platformLinks?: MarketplaceFooterLink[];
    legalLinks?: MarketplaceFooterLink[];
    statusLabel?: string;
};

const ECOSYSTEM_LINKS: MarketplaceFooterLink[] = [
    { label: 'SimplePlataforma', href: 'https://simpleplataforma.app' },
    { label: 'SimpleAgenda', href: 'https://simpleagenda.app' },
    { label: 'SimpleAutos', href: 'https://simpleautos.app' },
    { label: 'SimplePropiedades', href: 'https://simplepropiedades.app' },
    { label: 'SimpleSerenatas', href: 'https://simpleserenatas.app' },
];

const CONTACT_LINKS: MarketplaceFooterLink[] = [
    { label: 'Correo', href: 'mailto:hola@simpleplataforma.app' },
    { label: 'WhatsApp', href: 'https://wa.me/56978623828' },
];

const SOCIAL_LINKS: MarketplaceFooterLink[] = [
    { label: 'SimpleAutos en Instagram', href: 'https://www.instagram.com/simpleautos.app' },
    { label: 'SimplePropiedades en Instagram', href: 'https://www.instagram.com/simplepropiedades.app' },
    { label: 'SimpleSerenatas en Instagram', href: 'https://www.instagram.com/simpleserenata' },
];

const defaultLegal: MarketplaceFooterLink[] = [
    { label: 'Términos de servicio', href: '/terms' },
    { label: 'Privacidad', href: '/privacy' },
];

function FooterLink({ link, children }: { link: MarketplaceFooterLink; children: ReactNode }) {
    const external = /^(https?:|mailto:|tel:)/.test(link.href);
    if (external) {
        return (
            <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-(--fg-muted) transition-colors hover:text-(--fg)"
            >
                {children}
            </a>
        );
    }
    return (
        <Link href={link.href} className="text-sm text-(--fg-muted) transition-colors hover:text-(--fg)">
            {children}
        </Link>
    );
}

function FooterIconLink({
    link,
    children,
}: {
    link: MarketplaceFooterLink;
    children: ReactNode;
}) {
    return (
        <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
            className="inline-flex size-10 items-center justify-center rounded-full border border-(--border) bg-(--surface) text-(--fg-muted) transition-colors hover:border-(--border-strong) hover:text-(--fg)"
        >
            {children}
        </a>
    );
}

export function MarketplaceFooter({
    logo,
    description,
    copyrightName,
    sections = [],
    platformLinks = ECOSYSTEM_LINKS,
    legalLinks = defaultLegal,
    statusLabel = 'Sistemas operativos',
}: MarketplaceFooterProps) {
    const hasSections = sections.length > 0;
    const hasPlatform = platformLinks && platformLinks.length > 0;

    return (
        <footer className="border-t border-(--border) bg-(--bg-subtle)">
            <div className="container-app py-14">
                <div className="mb-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.65fr)_minmax(220px,0.75fr)]">
                    <div className="space-y-4">
                        <Link href="/" className="flex shrink-0 items-center gap-2">
                            {logo}
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-(--fg-muted)">{description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                        {hasSections
                            ? sections.map((section) => (
                                  <div key={section.title}>
                                      <h4 className="mb-4 text-sm font-medium text-(--fg)">{section.title}</h4>
                                      <ul className="space-y-3">
                                          {section.links.map((link) => (
                                              <li key={link.href}>
                                                  <Link
                                                      href={link.href}
                                                      className="text-sm text-(--fg-muted) transition-colors hover:text-(--fg)"
                                                  >
                                                      {link.label}
                                                  </Link>
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              ))
                            : null}

                        {hasPlatform ? (
                            <div>
                                <h4 className="mb-4 text-sm font-medium text-(--fg)">Ecosistema</h4>
                                <ul className="space-y-3">
                                    {platformLinks!.map((link) => (
                                        <li key={link.href}>
                                            <FooterLink link={link}>{link.label}</FooterLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        <div>
                            <h4 className="mb-4 text-sm font-medium text-(--fg)">Legal</h4>
                            <ul className="space-y-3">
                                {legalLinks.map((link) => (
                                    <li key={link.href}>
                                        <FooterLink link={link}>{link.label}</FooterLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-7 lg:text-right">
                        <div>
                            <h4 className="mb-4 text-sm font-medium text-(--fg)">Contacto</h4>
                            <div className="flex gap-2 lg:justify-end">
                                {CONTACT_LINKS.map((link) => (
                                    <FooterIconLink key={link.href} link={link}>
                                        {link.href.startsWith('mailto:')
                                            ? <IconMail size={18} stroke={1.8} />
                                            : <IconBrandWhatsapp size={18} stroke={1.8} />}
                                    </FooterIconLink>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="mb-4 text-sm font-medium text-(--fg)">Redes</h4>
                            <div className="flex gap-2 lg:justify-end">
                                {SOCIAL_LINKS.map((link) => (
                                    <FooterIconLink key={link.href} link={link}>
                                        <IconBrandInstagram size={18} stroke={1.8} />
                                    </FooterIconLink>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-(--border) pt-8 sm:flex-row">
                    <p className="text-center text-sm text-(--fg-muted) sm:text-left">
                        © {new Date().getFullYear()} {copyrightName}. Parte del ecosistema Simple. Desarrollado por{' '}
                        <a
                            href="https://www.artestudio.cl"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-(--fg-secondary) transition-colors hover:text-(--fg)"
                        >
                            Artestudio
                        </a>
                        .
                    </p>
                    <div className="flex items-center gap-2 rounded-full border border-(--border) px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-(--fg-muted)">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-(--color-success)" aria-hidden />
                        {statusLabel}
                    </div>
                </div>
            </div>
        </footer>
    );
}
