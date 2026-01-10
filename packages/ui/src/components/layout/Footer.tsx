'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCar,
  IconHome,
  IconShoppingBag,
  IconChefHat,
  IconTruckDelivery,
  IconHeart,
  IconShield,
  IconHelp,
} from '@tabler/icons-react';
import { VERTICALS, type VerticalName } from '@simple/config';

// Tipos
export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  whatsapp?: string;
  youtube?: string;
}

export interface ContactInfo {
  location?: string;
  phone?: string;
  email?: string;
}

export interface NavigationColumn {
  title: string;
  icon?: React.ComponentType<{ size?: number }>;
  links: Array<{
    label: string;
    href: string;
  }>;
}

export interface FooterProps {
  // Vertical (requerido)
  vertical: VerticalName;

  // Información de contacto
  contactInfo?: ContactInfo;

  // Redes sociales
  socialLinks?: SocialLinks;

  // Columnas de navegación personalizadas
  navigationColumns?: NavigationColumn[];

  // Descripción de la empresa
  description?: string;

  // Características destacadas (badges)
  badges?: Array<{
    icon: React.ComponentType<{ size?: number }>;
    label: string;
  }>;

  // Footer adicional personalizado
  bottomContent?: React.ReactNode;
}

// Configuración por defecto para cada vertical
const getDefaultConfig = (vertical: VerticalName) => {
  const verticalConfig = VERTICALS[vertical];

  switch (vertical) {
    case 'admin':
      return {
        description: 'Panel administrativo global de Simple.',
        icon: IconShield,
        navigationColumns: [],
        badges: [],
      };
    case 'autos':
      return {
        description:
          'La plataforma más simple para comprar y vender vehículos en Chile. Conectamos compradores y vendedores de manera segura y eficiente.',
        icon: IconCar,
        navigationColumns: [
          {
            title: 'Vehículos',
            icon: IconCar,
            links: [
              { label: 'Comprar Vehículos', href: '/ventas' },
              { label: 'Alquilar Vehículos', href: '/arriendos' },
              { label: 'Subastas', href: '/subastas' },
              { label: 'Vender mi Auto', href: '/panel/nueva-publicacion' },
            ],
          },
          {
            title: 'Empresa',
            icon: IconShield,
            links: [
              { label: 'Sobre Nosotros', href: '/empresa' },
              { label: 'Contacto', href: '/contacto' },
              { label: 'Centro de Ayuda', href: '/ayuda' },
              { label: 'Términos y Condiciones', href: '/terminos' },
            ],
          },
          {
            title: 'Soporte',
            icon: IconHelp,
            links: [
              { label: 'Preguntas Frecuentes', href: '/faq' },
              { label: 'Guía del Vendedor', href: '/guia-vendedor' },
              { label: 'Políticas de Privacidad', href: '/privacidad' },
              { label: 'Reportar Problema', href: '/reportar' },
            ],
          },
        ],
        badges: [
          { icon: IconShield, label: 'Compra Segura' },
          { icon: IconHeart, label: '100% Confiable' },
          { icon: IconCar, label: '+10,000 Vehículos' },
        ],
      };

    case 'properties':
      return {
        description:
          'La plataforma más simple para comprar, vender y arrendar propiedades en Chile. Tu próximo hogar está aquí.',
        icon: IconHome,
        navigationColumns: [
          {
            title: 'Propiedades',
            icon: IconHome,
            links: [
              { label: 'Comprar Propiedades', href: '/ventas' },
              { label: 'Arrendar Propiedades', href: '/arriendos' },
              { label: 'Propiedades Destacadas', href: '/destacadas' },
              { label: 'Publicar Propiedad', href: '/panel/nueva-publicacion' },
            ],
          },
          {
            title: 'Empresa',
            icon: IconShield,
            links: [
              { label: 'Sobre Nosotros', href: '/empresa' },
              { label: 'Contacto', href: '/contacto' },
              { label: 'Centro de Ayuda', href: '/ayuda' },
              { label: 'Términos y Condiciones', href: '/terminos' },
            ],
          },
          {
            title: 'Soporte',
            icon: IconHelp,
            links: [
              { label: 'Preguntas Frecuentes', href: '/faq' },
              { label: 'Guía del Propietario', href: '/guia-propietario' },
              { label: 'Políticas de Privacidad', href: '/privacidad' },
              { label: 'Reportar Problema', href: '/reportar' },
            ],
          },
        ],
        badges: [
          { icon: IconShield, label: 'Transacciones Seguras' },
          { icon: IconHeart, label: '100% Confiable' },
          { icon: IconHome, label: '+5,000 Propiedades' },
        ],
      };

    case 'stores':
      return {
        description:
          'La plataforma más simple para comprar y vender productos en Chile. Descubre las mejores ofertas de tiendas locales.',
        icon: IconShoppingBag,
        navigationColumns: [
          {
            title: 'Productos',
            icon: IconShoppingBag,
            links: [
              { label: 'Explorar Productos', href: '/productos' },
              { label: 'Servicios', href: '/servicios' },
              { label: 'Ofertas', href: '/ofertas' },
              { label: 'Vender Producto', href: '/panel/nueva-publicacion' },
            ],
          },
          {
            title: 'Empresa',
            icon: IconShield,
            links: [
              { label: 'Sobre Nosotros', href: '/empresa' },
              { label: 'Contacto', href: '/contacto' },
              { label: 'Centro de Ayuda', href: '/ayuda' },
              { label: 'Términos y Condiciones', href: '/terminos' },
            ],
          },
          {
            title: 'Soporte',
            icon: IconHelp,
            links: [
              { label: 'Preguntas Frecuentes', href: '/faq' },
              { label: 'Guía del Vendedor', href: '/guia-vendedor' },
              { label: 'Políticas de Privacidad', href: '/privacidad' },
              { label: 'Reportar Problema', href: '/reportar' },
            ],
          },
        ],
        badges: [
          { icon: IconShield, label: 'Compra Segura' },
          { icon: IconHeart, label: '100% Confiable' },
          { icon: IconShoppingBag, label: '+20,000 Productos' },
        ],
      };

    case 'food':
      return {
        description:
          'Impulsa tu restaurante o dark kitchen con ventas online, pedidos en tiempo real y operaciones conectadas.',
        icon: IconChefHat,
        navigationColumns: [
          {
            title: 'Restaurantes',
            icon: IconChefHat,
            links: [
              { label: 'Buscar Restaurantes', href: '/restaurantes' },
              { label: 'Cocinas Virtuales', href: '/cocinas' },
              { label: 'Nuevos Socios', href: '/socios' },
              { label: 'Publicar Restaurante', href: '/panel/nueva-publicacion' },
            ],
          },
          {
            title: 'Operaciones',
            icon: IconTruckDelivery,
            links: [
              { label: 'Gestión de Pedidos', href: '/pedidos' },
              { label: 'Repartidores', href: '/repartidores' },
              { label: 'Integraciones POS', href: '/integraciones' },
              { label: 'Panel Logístico', href: '/panel' },
            ],
          },
          {
            title: 'Soporte',
            icon: IconHelp,
            links: [
              { label: 'Centro de Ayuda', href: '/ayuda' },
              { label: 'Preguntas Frecuentes', href: '/faq' },
              { label: 'Políticas Sanitarias', href: '/politicas' },
              { label: 'Reportar Problema', href: '/reportar' },
            ],
          },
        ],
        badges: [
          { icon: IconShield, label: 'Pagos Seguros' },
          { icon: IconTruckDelivery, label: 'Delivery Integrado' },
          { icon: IconChefHat, label: '+2,000 Restaurantes' },
        ],
      };
  }

  return {
    description: verticalConfig?.tagline ?? 'Simple',
    icon: IconShield,
    navigationColumns: [],
    badges: [],
  };
};

const SOCIAL_HANDLES: Record<VerticalName, string> = {
  admin: 'simpleadmin',
  autos: 'simpleautos',
  properties: 'simplepropiedades',
  stores: 'simpletiendas',
  food: 'simplefood',
};

const Footer: React.FC<FooterProps> = ({
  vertical,
  contactInfo = {
    location: 'Santiago, Chile',
    phone: '+56 9 1234 5678',
    email: 'hola@simple.app',
  },
  socialLinks = {
    instagram: `https://instagram.com/${SOCIAL_HANDLES[vertical]}.app`,
    tiktok: `https://tiktok.com/@${SOCIAL_HANDLES[vertical]}.app`,
    facebook: `https://facebook.com/${SOCIAL_HANDLES[vertical]}.app`,
    whatsapp: 'https://wa.me/56912345678',
    youtube: `https://youtube.com/@${SOCIAL_HANDLES[vertical]}.app`,
  },
  navigationColumns,
  description,
  badges,
  bottomContent,
}) => {
  // Obtener configuración por defecto
  const defaultConfig = getDefaultConfig(vertical);
  const verticalConfig = VERTICALS[vertical];

  // Usar valores por defecto si no se proporcionan
  const finalDescription = description || defaultConfig.description;
  const finalNavigationColumns = navigationColumns || defaultConfig.navigationColumns;
  const finalBadges = badges || defaultConfig.badges;

  return (
    <footer className="w-full px-4 md:px-8 lg:px-8 py-6">
      {/* Card wide similar al header; uses shared card surface tokens for consistency across verticals */}
      <div className="relative w-full card-surface shadow-card overflow-hidden">
        {/* Gradiente sutil en la parte superior con el color de la vertical */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
          style={{ color: verticalConfig.color }}
        ></div>

        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Columna 1: Información de la empresa */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-full"
                    style={{ backgroundColor: verticalConfig.color }}
                  >
                    <span className="select-none font-extrabold text-[16px] leading-[1] text-black">
                      S
                    </span>
                  </span>
                  <h3 className="text-lg font-bold text-lighttext dark:text-darktext">
                    {verticalConfig.name}
                  </h3>
                </div>
                <p className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4 leading-relaxed">
                  {finalDescription}
                </p>
                <div className="space-y-2 text-sm">
                  {contactInfo.location && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconMapPin size={16} />
                      <span>{contactInfo.location}</span>
                    </div>
                  )}
                  {contactInfo.phone && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconPhone size={16} />
                      <span>{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconMail size={16} />
                      <span>{contactInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Columnas de navegación dinámicas */}
              {finalNavigationColumns.map((column, index) => {
                const ColumnIcon = column.icon;
                return (
                  <div key={index}>
                    <h4 className="text-base font-semibold mb-4 text-lighttext dark:text-darktext flex items-center gap-2">
                      {ColumnIcon && <ColumnIcon size={18} />}
                      {column.title}
                    </h4>
                    <ul className="space-y-2">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="text-sm text-lighttext/70 dark:text-darktext/70 hover:text-lighttext dark:hover:text-darktext transition-colors"
                            style={{
                              '--hover-color': verticalConfig.color,
                            } as React.CSSProperties}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = verticalConfig.color;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '';
                            }}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Sección inferior: Redes sociales y créditos */}
            <div className="border-t border-[var(--color-border)] pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Redes sociales */}
                <div className="flex flex-col items-center md:items-start gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-lighttext/70 dark:text-darktext/70 mr-2">
                      Síguenos:
                    </span>
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--footer-hover)] transition-all duration-200 hover:scale-110"
                        style={{ ['--footer-hover' as any]: verticalConfig.color }}
                        aria-label="Instagram"
                      >
                        <IconBrandInstagram size={20} stroke={1.5} />
                      </a>
                    )}
                    {socialLinks.tiktok && (
                      <a
                        href={socialLinks.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--footer-hover)] transition-all duration-200 hover:scale-110"
                        style={{ ['--footer-hover' as any]: verticalConfig.color }}
                        aria-label="TikTok"
                      >
                        <IconBrandTiktok size={20} stroke={1.5} />
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--footer-hover)] transition-all duration-200 hover:scale-110"
                        style={{ ['--footer-hover' as any]: verticalConfig.color }}
                        aria-label="Facebook"
                      >
                        <IconBrandFacebook size={20} stroke={1.5} />
                      </a>
                    )}
                    {socialLinks.whatsapp && (
                      <a
                        href={socialLinks.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--footer-hover)] transition-all duration-200 hover:scale-110"
                        style={{ ['--footer-hover' as any]: verticalConfig.color }}
                        aria-label="WhatsApp"
                      >
                        <IconBrandWhatsapp size={20} stroke={1.5} />
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a
                        href={socialLinks.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-[var(--footer-hover)] transition-all duration-200 hover:scale-110"
                        style={{ ['--footer-hover' as any]: verticalConfig.color }}
                        aria-label="YouTube"
                      >
                        <IconBrandYoutube size={20} stroke={1.5} />
                      </a>
                    )}
                  </div>

                  {/* Características destacadas (badges) */}
                  <div className="flex items-center gap-6 text-xs text-lighttext/70 dark:text-darktext/70">
                    {finalBadges.map((badge, index) => {
                      const BadgeIcon = badge.icon;
                      return (
                        <div key={index} className="flex items-center gap-1">
                          <BadgeIcon size={14} />
                          <span>{badge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Créditos y copyright */}
                <div className="flex flex-col items-center md:items-end gap-2">
                  {bottomContent || (
                    <>
                      <p className="text-xs text-lighttext/60 dark:text-darktext/60 text-center md:text-right">
                        © {new Date().getFullYear()} {verticalConfig.name}. Todos los derechos
                        reservados.
                      </p>
                      <p className="text-xs text-lighttext/60 dark:text-darktext/60 text-center md:text-right">
                        Creado con <span className="text-[var(--color-danger)]">♥</span> por{' '}
                        <a
                          href="https://www.artestudio.cl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lighttext dark:text-darktext hover:text-current transition-colors font-medium"
                          style={{
                            '--hover-color': verticalConfig.color,
                          } as React.CSSProperties}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = verticalConfig.color;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '';
                          }}
                        >
                          Artestudio
                        </a>
                      </p>
                    </>
                  )}
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
