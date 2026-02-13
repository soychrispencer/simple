import React from 'react';
import {
  Footer as SharedFooter,
  type NavigationColumn,
  type SocialLinks,
  type ContactInfo,
} from '@simple/ui';
import {
  IconCar,
  IconHeart,
  IconHelp,
  IconShield,
} from '@tabler/icons-react';
import { AUTOS_BRANDING } from '@/config/branding';

const socialLinks: SocialLinks = {
  instagram: `https://instagram.com/${AUTOS_BRANDING.domain}`,
  tiktok: `https://tiktok.com/@${AUTOS_BRANDING.domain}`,
  facebook: `https://facebook.com/${AUTOS_BRANDING.domain}`,
  whatsapp: `https://wa.me/${AUTOS_BRANDING.supportWhatsAppDigits}`,
  youtube: `https://youtube.com/@${AUTOS_BRANDING.domain}`,
};

const contactInfo: ContactInfo = {
  location: 'Santiago, Chile',
  phone: AUTOS_BRANDING.supportWhatsAppDisplay,
  email: AUTOS_BRANDING.supportEmail,
};

const navigationColumns: NavigationColumn[] = [
  {
    title: 'Vehículos',
    icon: IconCar,
    links: [
      { label: 'Comprar Vehículos', href: '/ventas' },
      { label: 'Arrendar Vehículos', href: '/arriendos' },
      { label: 'Subastas', href: '/subastas' },
      { label: 'Publicar mi Vehículo', href: '/panel/publicar-vehiculo?new=1' },
      { label: 'Venta asistida', href: '/servicios/venta-asistida' },
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
];

const badges = [
  { icon: IconShield, label: 'Compra Segura' },
  { icon: IconHeart, label: '100% Confiable' },
  { icon: IconCar, label: '+10,000 Vehículos' },
];

export default function Footer() {
  return (
    <SharedFooter
      vertical="autos"
      description="La plataforma más simple para comprar y vender vehículos en Chile. Conectamos compradores y vendedores de manera segura y eficiente."
      navigationColumns={navigationColumns}
      contactInfo={contactInfo}
      socialLinks={socialLinks}
      badges={badges}
      brandLogo={{
        light: AUTOS_BRANDING.logos.light,
        dark: AUTOS_BRANDING.logos.dark,
        color: AUTOS_BRANDING.logos.color,
        alt: AUTOS_BRANDING.appName,
      }}
    />
  );
}
