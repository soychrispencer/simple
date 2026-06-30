'use client';

import { useEffect, useState } from 'react';
import { IconCalendarEvent, IconMenu2, IconX } from '@tabler/icons-react';

export type OperatorSiteNavItem = {
    id: string;
    label: string;
};

type OperatorSiteNavProps = {
    brandLabel: string;
    items: OperatorSiteNavItem[];
    scrolled: boolean;
    onNavigate: (id: string) => void;
    reserveLabel?: string;
    reserveSectionId?: string;
};

export function OperatorSiteNav({
    brandLabel,
    items,
    scrolled,
    onNavigate,
    reserveLabel = 'Reservar',
    reserveSectionId = 'servicios',
}: OperatorSiteNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!menuOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const navigate = (id: string) => {
        setMenuOpen(false);
        onNavigate(id);
    };

    return (
        <>
            <header className={`os-nav ${scrolled ? 'os-nav--scrolled' : ''}`}>
                <div className="os-nav__inner">
                    <button type="button" className="os-nav__brand" onClick={() => navigate('inicio')}>
                        {brandLabel}
                    </button>

                    <nav className="os-nav__links" aria-label="Secciones">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className="os-nav__link"
                                onClick={() => navigate(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="os-nav__actions">
                        <button
                            type="button"
                            className="os-nav__menu"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Abrir menú de secciones"
                            aria-expanded={menuOpen}
                        >
                            <IconMenu2 size={20} />
                        </button>
                        <button type="button" className="os-nav__cta" onClick={() => navigate(reserveSectionId)}>
                            <IconCalendarEvent size={16} />
                            <span className="os-nav__cta-label">{reserveLabel}</span>
                        </button>
                    </div>
                </div>
            </header>

            {menuOpen ? (
                <div className="os-nav-drawer" role="dialog" aria-modal="true" aria-label="Menú de secciones">
                    <button
                        type="button"
                        className="os-nav-drawer__backdrop"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Cerrar menú"
                    />
                    <div className="os-nav-drawer__panel">
                        <div className="os-nav-drawer__head">
                            <p className="os-nav-drawer__title">{brandLabel}</p>
                            <button
                                type="button"
                                className="os-nav-drawer__close"
                                onClick={() => setMenuOpen(false)}
                                aria-label="Cerrar menú"
                            >
                                <IconX size={20} />
                            </button>
                        </div>
                        <nav className="os-nav-drawer__links">
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className="os-nav-drawer__link"
                                    onClick={() => navigate(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                        <button type="button" className="os-nav-drawer__cta" onClick={() => navigate(reserveSectionId)}>
                            <IconCalendarEvent size={18} />
                            {reserveLabel}
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}
