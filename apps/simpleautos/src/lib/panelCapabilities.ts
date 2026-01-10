import { useMemo } from "react";
import type { PanelManifest } from "@simple/ui";
import type { Profile } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";

export interface PanelCapabilities {
  hasBusiness: boolean;
  canPublish: boolean;
  hasInteractions: boolean;
  hasGrowth: boolean;
  hasPublicPage: boolean;
  onboardingStatus?: string | null;
}

function deriveCapabilities(profile: Profile | null | undefined): PanelCapabilities {
  const hasBusiness = Boolean(profile?.has_business);
  const planKey = profile?.plan_key ?? "free";
  const onboardingStatus = profile?.onboarding_status ?? null;

  return {
    hasBusiness,
    canPublish: hasBusiness, // publicar requiere negocio activo
    hasInteractions: true, // mensajes/guardados disponibles para usuarios logueados
    hasGrowth: hasBusiness && planKey !== "free",
    hasPublicPage: hasBusiness && planKey !== "free",
    onboardingStatus,
  };
}

export function buildPanelManifest(capabilities: PanelCapabilities): PanelManifest {
  const { hasBusiness, canPublish, hasInteractions, hasGrowth, hasPublicPage } = capabilities;

  const sidebarSections: PanelManifest["sidebar"] = [];

  // Inicio
  sidebarSections.push({
    id: "inicio",
    title: "Inicio",
    items: [
      {
        id: "overview",
        label: "Mi Panel",
        href: "/panel",
        icon: "dashboard",
        description: "Resumen y KPIs clave",
        status: "active",
      },
    ],
  });

  // Mi Negocio
  if (hasBusiness) {
    const businessItems: PanelManifest["sidebar"][number]["items"] = [
      {
        id: "business",
        label: "Mi Negocio",
        href: "/panel/mi-negocio",
        icon: "company",
        description: "Información pública y branding",
        status: "active",
      },
    ];

    if (hasPublicPage) {
      businessItems.push({
        id: "public-page",
        label: "Mi Página",
        href: "/panel/mi-pagina",
        icon: "public-profile",
        description: "Vitrina y datos visibles al cliente",
        status: "active",
      });
    }

    sidebarSections.push({
      id: "negocio",
      title: "Mi Negocio",
      items: businessItems,
    });
  }

  // Publicaciones
  if (canPublish) {
    sidebarSections.push({
      id: "publicaciones",
      title: "Publicaciones",
      items: [
        {
          id: "new-listing",
          label: "Publicar Vehiculo",
          href: "/panel/publicar-vehiculo?new=1",
          icon: "publish",
          description: "Crear nueva publicación",
          status: "active",
        },
        {
          id: "listings",
          label: "Mis Publicaciones",
          href: "/panel/mis-publicaciones",
          icon: "listings",
          description: "Gestiona inventario y estados",
          status: "active",
        },
      ],
    });
  }

  // Clientes
  if (hasInteractions) {
    sidebarSections.push({
      id: "clientes",
      title: "Clientes",
      items: [
        {
          id: "messages",
          label: "Mis Mensajes",
          href: "/panel/mis-mensajes",
          icon: "messages",
          description: "Consultas y chats",
          status: "active",
        },
        {
          id: "favorites",
          label: "Guardados",
          href: "/panel/guardados",
          icon: "favorites",
          description: "Usuarios interesados",
          status: "active",
        },
      ],
    });
  }

  // Crecimiento
  if (hasGrowth) {
    sidebarSections.push({
      id: "crecimiento",
      title: "Crecimiento",
      items: [
        {
          id: "stats",
          label: "Estadisticas",
          href: "/panel/estadisticas",
          icon: "chart",
          description: "KPIs y conversiones",
          status: "active",
        },
        {
          id: "integrations",
          label: "Integraciones",
          href: "/panel/integraciones",
          icon: "integrations",
          description: "Portales y apps externas",
          status: "active",
        },
        {
          id: "membership",
          label: "Mis Suscripciones",
          href: "/panel/mis-suscripciones",
          icon: "billing",
          description: "Plan y facturación",
          status: "active",
        },
      ],
    });
  }

  // Cuenta
  sidebarSections.push({
    id: "cuenta",
    title: "Cuenta",
    items: [
      {
        id: "profile",
        label: "Mi Perfil",
        href: "/panel/mi-perfil",
        icon: "user",
        description: "Datos privados y credenciales",
        status: "active",
      },
      {
        id: "settings",
        label: "Configuraciones",
        href: "/panel/configuraciones",
        icon: "settings",
        description: "Preferencias del panel",
        status: "active",
      },
    ],
  });

  const manifest: PanelManifest = {
    vertical: "autos",
    version: "2025.12.18",
    updatedAt: "2025-12-18",
    sidebar: sidebarSections,
    dashboard: [],
    quickActions: [],
  };

  if (canPublish) {
    manifest.quickActions?.push({
      id: "quick_publish",
      label: "Publicar Vehiculo",
      href: "/panel/publicar-vehiculo?new=1",
      icon: "publish",
      status: "active",
    });
  }

  if (hasPublicPage) {
    manifest.quickActions?.push({
      id: "view_public_profile",
      label: "Ver pagina pública",
      href: "/panel/mi-pagina",
      icon: "public-profile",
      status: "active",
    });
  }

  return manifest;
}

export function usePanelCapabilities() {
  const { profile, loading } = useAuth();

  const capabilities = useMemo(() => deriveCapabilities(profile), [profile]);
  const manifest = useMemo(() => buildPanelManifest(capabilities), [capabilities]);

  return { capabilities, manifest, loading };
}
