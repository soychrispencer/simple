'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import {
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandFacebook,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconMail,
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
import type { BrandLogoConfig } from './Header';

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

const toWhatsAppHref = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : 'https://wa.me/56978623828';
};

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
  brandLogo?: BrandLogoConfig;
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
              { label: 'Arrendar Vehículos', href: '/arriendos' },
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
  contactInfo,
  socialLinks,
  navigationColumns,
  description,
  badges,
  bottomContent,
  brandLogo,
}) => {
  const { resolvedTheme } = useTheme();
  const [brandLogoLoadError, setBrandLogoLoadError] = useState(false);

  // Obtener configuración por defecto
  const defaultConfig = getDefaultConfig(vertical);
  const verticalConfig = VERTICALS[vertical];
  const defaultContactInfo = useMemo<ContactInfo>(
    () => ({
      location: 'Santiago, Chile',
      phone: '+56 9 7862 3828',
      email: `hola@${SOCIAL_HANDLES[vertical]}.app`,
    }),
    [vertical]
  );
  const defaultSocialLinks = useMemo<SocialLinks>(
    () => ({
      instagram: `https://instagram.com/${SOCIAL_HANDLES[vertical]}.app`,
      tiktok: `https://tiktok.com/@${SOCIAL_HANDLES[vertical]}.app`,
      facebook: `https://facebook.com/${SOCIAL_HANDLES[vertical]}.app`,
      whatsapp: 'https://wa.me/56978623828',
      youtube: `https://youtube.com/@${SOCIAL_HANDLES[vertical]}.app`,
    }),
    [vertical]
  );
  const finalContactInfo: ContactInfo = { ...defaultContactInfo, ...contactInfo };
  const finalSocialLinks: SocialLinks = { ...defaultSocialLinks, ...socialLinks };
  const brandLogoSrc = useMemo(() => {
    if (!brandLogo) return null;
    if (resolvedTheme === 'dark') {
      return brandLogo.dark || brandLogo.light || brandLogo.color || null;
    }
    return brandLogo.light || brandLogo.dark || brandLogo.color || null;
  }, [brandLogo, resolvedTheme]);
  const brandLogoAlt = brandLogo?.alt ?? verticalConfig.name;

  useEffect(() => {
    setBrandLogoLoadError(false);
  }, [brandLogoSrc]);

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
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-25"
        ></div>

        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Grid principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {/* Columna 1: Información de la empresa */}
              <div className="lg:col-span-1">
                {brandLogoSrc && !brandLogoLoadError ? (
                  <div className="mb-4 flex items-center gap-2">
                    <Image
                      src={brandLogoSrc}
                      alt={brandLogoAlt}
                      width={brandLogo?.width ?? 48}
                      height={brandLogo?.height ?? 48}
                      className="h-12 w-12 object-contain shrink-0"
                      onError={() => setBrandLogoLoadError(true)}
                    />
                    <h3 className="type-title-3 text-lighttext dark:text-darktext">
                      {verticalConfig.name}
                    </h3>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary-a15)] ring-1 ring-[var(--color-primary-a30)]"
                    >
                      <span className="select-none font-extrabold text-[16px] leading-[1] text-primary">
                        S
                      </span>
                    </span>
                    <h3 className="type-title-3 text-lighttext dark:text-darktext">
                      {verticalConfig.name}
                    </h3>
                  </div>
                )}
                <p className="type-body-sm text-lighttext/70 dark:text-darktext/70 mb-4">
                  {finalDescription}
                </p>
                <div className="space-y-2 type-body-sm">
                  {finalContactInfo.location && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconMapPin size={16} />
                      <span>{finalContactInfo.location}</span>
                    </div>
                  )}
                  {finalContactInfo.phone && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconBrandWhatsapp size={16} />
                      <a
                        href={toWhatsAppHref(finalContactInfo.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-lighttext dark:hover:text-darktext transition-colors"
                      >
                        {finalContactInfo.phone}
                      </a>
                    </div>
                  )}
                  {finalContactInfo.email && (
                    <div className="flex items-center gap-2 text-lighttext/70 dark:text-darktext/70">
                      <IconMail size={16} />
                      <span>{finalContactInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Columnas de navegación dinámicas */}
              {finalNavigationColumns.map((column, index) => {
                const ColumnIcon = column.icon;
                return (
                  <div key={index}>
                    <h4 className="type-title-4 mb-4 text-lighttext dark:text-darktext flex items-center gap-2">
                      {ColumnIcon && <ColumnIcon size={18} />}
                      {column.title}
                    </h4>
                    <ul className="space-y-2">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="type-body-sm text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-colors"
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
                    <span className="type-body-sm font-medium text-lighttext/70 dark:text-darktext/70 mr-2">
                      Síguenos:
                    </span>
                    {finalSocialLinks.instagram && (
                      <a
                        href={finalSocialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-all duration-200 hover:scale-110"
                        aria-label="Instagram"
                      >
                        <IconBrandInstagram size={20} stroke={1.5} />
                      </a>
                    )}
                    {finalSocialLinks.tiktok && (
                      <a
                        href={finalSocialLinks.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-all duration-200 hover:scale-110"
                        aria-label="TikTok"
                      >
                        <IconBrandTiktok size={20} stroke={1.5} />
                      </a>
                    )}
                    {finalSocialLinks.facebook && (
                      <a
                        href={finalSocialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-all duration-200 hover:scale-110"
                        aria-label="Facebook"
                      >
                        <IconBrandFacebook size={20} stroke={1.5} />
                      </a>
                    )}
                    {finalSocialLinks.whatsapp && (
                      <a
                        href={finalSocialLinks.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-all duration-200 hover:scale-110"
                        aria-label="WhatsApp"
                      >
                        <IconBrandWhatsapp size={20} stroke={1.5} />
                      </a>
                    )}
                    {finalSocialLinks.youtube && (
                      <a
                        href={finalSocialLinks.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lighttext/70 dark:text-darktext/70 hover:text-primary transition-all duration-200 hover:scale-110"
                        aria-label="YouTube"
                      >
                        <IconBrandYoutube size={20} stroke={1.5} />
                      </a>
                    )}
                  </div>

                  {/* Características destacadas (badges) */}
                  <div className="flex items-center gap-6 type-caption text-lighttext/70 dark:text-darktext/70">
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
                      <p className="type-caption text-lighttext/60 dark:text-darktext/60 text-center md:text-right">
                        © {new Date().getFullYear()} {verticalConfig.name}. Todos los derechos
                        reservados.
                      </p>
                      <p className="type-caption text-lighttext/60 dark:text-darktext/60 text-center md:text-right">
                        Creado con <span className="text-[var(--color-danger)]">♥</span> por{' '}
                        <a
                          href="https://www.artestudio.cl"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lighttext dark:text-darktext hover:text-primary transition-colors font-medium"
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
