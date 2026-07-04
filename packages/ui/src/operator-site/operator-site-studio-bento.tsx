'use client';

import Link from 'next/link';
import {
    IconBrandWhatsapp,
    IconBuildingBank,
    IconCreditCard,
    IconLink,
    IconMail,
    IconMapPin,
    IconPhone,
    IconWorld,
} from '@tabler/icons-react';
import { OperatorSiteReveal } from './operator-site-reveal.js';
import { OperatorSiteScheduleSidebar } from './operator-site-schedule.js';
import { socialIcon } from './operator-site-icons.js';
import type {
    AgendaOperatorSiteProfile,
    OperatorSiteSchedule,
    OperatorSiteSocialLink,
} from './types.js';

type OperatorSiteStudioBentoProps = {
    profile: AgendaOperatorSiteProfile;
    bio: string | null;
    schedule: OperatorSiteSchedule | null;
    socialLinks: OperatorSiteSocialLink[];
    hasLocation: boolean;
    hasContact: boolean;
    hasPayments: boolean;
    whatsappHref: string | null;
};

export function OperatorSiteStudioBento({
    profile,
    bio,
    schedule,
    socialLinks,
    hasLocation,
    hasContact,
    hasPayments,
    whatsappHref,
}: OperatorSiteStudioBentoProps) {
    const pm = profile.paymentMethods;
    const hasMercadoPago = pm.mpConnected || pm.acceptsMp;
    const hasTransfer = Boolean(pm.bankTransferData);
    const hasPaymentLink = Boolean(pm.paymentLinkUrl);

    return (
        <OperatorSiteReveal delayMs={60} variant="fade-up">
            <section className="os-section os-section--bento">
                <div className="os-section__inner">
                    <p className="os-section__label">Tu consulta</p>
                    <h2 className="os-section__title">Información clave</h2>
                    <div className="os-bento">
                        {bio ? (
                            <div className="os-bento__cell os-bento__cell--bio os-glass" id="sobre-mi">
                                <p className="os-bento__label">Sobre mí</p>
                                <p className="os-bento__bio">{bio}</p>
                            </div>
                        ) : null}

                        {schedule ? (
                            <div className="os-bento__cell os-bento__cell--schedule" id="horarios">
                                <OperatorSiteScheduleSidebar schedule={schedule} />
                            </div>
                        ) : null}

                        {hasLocation ? (
                            <div className="os-bento__cell os-bento__cell--location os-glass" id="ubicacion">
                                <p className="os-bento__label">Ubicación</p>
                                <div className="flex flex-col gap-2">
                                    {profile.city ? (
                                        <div className="os-bento__row">
                                            <IconMapPin size={16} />
                                            <span>{[profile.city, profile.region].filter(Boolean).join(', ')}</span>
                                        </div>
                                    ) : null}
                                    {profile.locations.slice(0, 2).map((loc) => (
                                        <div key={loc.id} className="os-bento__row">
                                            <IconMapPin size={16} />
                                            <span className="min-w-0">
                                                <strong>{loc.name}</strong>
                                                <br />
                                                {loc.addressLine}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {hasContact ? (
                            <div className="os-bento__cell os-bento__cell--contact os-glass" id="contacto">
                                <p className="os-bento__label">Contacto</p>
                                <div className="os-bento__contact-grid">
                                    {profile.publicPhone ? (
                                        <a href={`tel:${profile.publicPhone}`} className="os-bento__chip">
                                            <IconPhone size={15} />
                                            Teléfono
                                        </a>
                                    ) : null}
                                    {whatsappHref ? (
                                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="os-bento__chip">
                                            <IconBrandWhatsapp size={15} />
                                            WhatsApp
                                        </a>
                                    ) : null}
                                    {profile.publicEmail ? (
                                        <a href={`mailto:${profile.publicEmail}`} className="os-bento__chip">
                                            <IconMail size={15} />
                                            Email
                                        </a>
                                    ) : null}
                                    {profile.websiteUrl ? (
                                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="os-bento__chip">
                                            <IconWorld size={15} />
                                            Web
                                        </a>
                                    ) : null}
                                </div>
                                {socialLinks.length > 0 ? (
                                    <div className="os-social-row" style={{ marginTop: '0.75rem' }}>
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
                                                {socialIcon(link.kind)}
                                            </a>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {hasPayments && (hasMercadoPago || hasTransfer || hasPaymentLink) ? (
                            <div className="os-bento__cell os-bento__cell--payments os-glass" id="pagos">
                                <p className="os-bento__label">Pagos</p>
                                <div className="flex flex-col gap-2 text-sm text-(--fg-secondary)">
                                    {hasMercadoPago ? (
                                        <span className="os-bento__row">
                                            <IconCreditCard size={16} />
                                            Mercado Pago
                                        </span>
                                    ) : null}
                                    {hasTransfer ? (
                                        <span className="os-bento__row">
                                            <IconBuildingBank size={16} />
                                            Transferencia
                                        </span>
                                    ) : null}
                                    {hasPaymentLink && pm.paymentLinkUrl ? (
                                        <Link href={pm.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="os-bento__row text-(--accent)">
                                            <IconLink size={16} />
                                            Link de pago
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </section>
        </OperatorSiteReveal>
    );
}
