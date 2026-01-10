import React from 'react';
import Link from 'next/link';
import { IconBrandInstagram, IconBrandTiktok, IconBrandFacebook, IconBrandWhatsapp, IconBrandYoutube, IconMail, IconPhone, IconMapPin, IconCar, IconHeart, IconShield, IconHelp } from '@tabler/icons-react';
import { verticalThemes } from '@simple/config';

const Footer = () => {
  const theme = verticalThemes.autos;

  const socialLinks = {
    instagram: 'https://instagram.com/simpleautos.app',
    tiktok: 'https://tiktok.com/@simpleautos.app',
    facebook: 'https://facebook.com/simpleautos.app',
    whatsapp: 'https://wa.me/56912345678',
    youtube: 'https://youtube.com/@simpleautos.app'
  };

  const navigationLinks = {
    vehiculos: [
      { label: 'Comprar Vehículos', href: '/ventas' },
      { label: 'Alquilar Vehículos', href: '/arriendos' },
      { label: 'Subastas', href: '/subastas' },
      { label: 'Vender mi Auto', href: '/panel/publicar-vehiculo?new=1' }
    ],
    empresa: [
      { label: 'Sobre Nosotros', href: '/empresa' },
      { label: 'Contacto', href: '/contacto' },
      { label: 'Centro de Ayuda', href: '/ayuda' },
      { label: 'Términos y Condiciones', href: '/terminos' }
    ],
    soporte: [
      { label: 'Preguntas Frecuentes', href: '/faq' },
      { label: 'Guía del Vendedor', href: '/guia-vendedor' },
      { label: 'Políticas de Privacidad', href: '/privacidad' },
      { label: 'Reportar Problema', href: '/reportar' }
    ]
  };

  return (
    <footer className="w-full px-4 md:px-8 lg:px-8 py-6">
      {/* Card wide similar al header */}
      <div className="relative w-full card-surface shadow-card overflow-hidden">
        {/* Gradiente sutil en la parte superior */}
        <div className="absolute top-0 left-0 right-0 h-px bg-[var(--color-border)]"></div>

        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Columna 1: Información de la empresa */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-full shadow-card ring-2 ring-[color:var(--overlay-highlight-80)] ring-offset-2 ring-offset-transparent"
                    style={{ backgroundColor: theme.primary }}
                    aria-hidden
                  >
                    <IconCar size={22} stroke={1.8} className="text-black" />
                  </span>
                  <h3 className="select-none text-lg leading-8 text-lighttext dark:text-darktext whitespace-nowrap">
                    <span className="font-normal tracking-tight">Simple</span>
                    <span className="font-bold tracking-tight">Autos</span>
                  </h3>
                </div>
                <p className="text-sm text-lighttext/80 dark:text-darktext/80 mb-4 leading-relaxed">
                  La plataforma más simple para comprar y vender vehículos en Chile. Conectamos compradores y vendedores de manera segura y eficiente.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-lighttext/80 dark:text-darktext/80">
                    <IconMapPin size={16} />
                    <span>Santiago, Chile</span>
                  </div>
                  <div className="flex items-center gap-2 text-lighttext/80 dark:text-darktext/80">
                    <IconPhone size={16} />
                    <span>+56 9 1234 5678</span>
                  </div>
                  <div className="flex items-center gap-2 text-lighttext/80 dark:text-darktext/80">
                    <IconMail size={16} />
                    <span>hola@simpleautos.app</span>
                  </div>
                </div>
              </div>

              {/* Columna 2: Vehículos */}
              <div>
                <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext flex items-center gap-2">
                  <IconCar size={18} />
                  Vehículos
                </h4>
                <ul className="space-y-2">
                  {navigationLinks.vehiculos.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-lighttext/80 dark:text-darktext/80 hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna 3: Empresa */}
              <div>
                <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext flex items-center gap-2">
                  <IconShield size={18} />
                  Empresa
                </h4>
                <ul className="space-y-2">
                  {navigationLinks.empresa.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-lighttext/80 dark:text-darktext/80 hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Columna 4: Soporte */}
              <div>
                <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext flex items-center gap-2">
                  <IconHelp size={18} />
                  Soporte
                </h4>
                <ul className="space-y-2">
                  {navigationLinks.soporte.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-lighttext/80 dark:text-darktext/80 hover:text-primary dark:hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sección inferior: Redes sociales y créditos */}
            <div className="border-t border-border/60 pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Redes sociales */}
                <div className="flex flex-col items-center md:items-start gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-lighttext/80 dark:text-darktext/80 mr-2">Síguenos:</span>
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--color-primary)] transition-all duration-200 hover:scale-110"
                      aria-label="Instagram"
                    >
                      <IconBrandInstagram size={20} stroke={1.5} />
                    </a>
                    <a
                      href={socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--color-primary)] transition-all duration-200 hover:scale-110"
                      aria-label="TikTok"
                    >
                      <IconBrandTiktok size={20} stroke={1.5} />
                    </a>
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--color-primary)] transition-all duration-200 hover:scale-110"
                      aria-label="Facebook"
                    >
                      <IconBrandFacebook size={20} stroke={1.5} />
                    </a>
                    <a
                      href={socialLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext/70 dark:text-darktext/70 hover:text-primary dark:hover:text-primary transition-all duration-200 hover:scale-110"
                      aria-label="WhatsApp"
                    >
                      <IconBrandWhatsapp size={20} stroke={1.5} />
                    </a>
                    <a
                      href={socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--color-primary)] transition-all duration-200 hover:scale-110"
                      aria-label="YouTube"
                    >
                      <IconBrandYoutube size={20} stroke={1.5} />
                    </a>
                  </div>

                  {/* Características destacadas */}
                  <div className="flex items-center gap-6 text-xs text-lighttext/70 dark:text-darktext/70">
                    <div className="flex items-center gap-1">
                      <IconShield size={14} />
                      <span>Compra Segura</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconHeart size={14} />
                      <span>100% Confiable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconCar size={14} />
                      <span>+10,000 Vehículos</span>
                    </div>
                  </div>
                </div>

                {/* Créditos y copyright */}
                <div className="flex flex-col items-center md:items-end gap-2">
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70 text-center md:text-right">
                    © {new Date().getFullYear()} SimpleAutos. Todos los derechos reservados.
                  </p>
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70 text-center md:text-right">
                    Creado con <span className="text-[var(--color-danger)]">❤️</span> por{' '}
                    <a
                      href="https://www.artestudio.cl"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lighttext dark:text-darktext hover:text-primary dark:hover:text-primary transition-colors font-medium"
                    >
                      Artestudio
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;







