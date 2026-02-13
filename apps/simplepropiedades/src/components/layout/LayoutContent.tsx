"use client";
import { Header, Footer, NotificationsBell, AuthModalMount, AuthCallbackToasts } from "@simple/ui";
import { useAuth } from '@simple/auth';
import { useEffect, useState } from 'react';
import { propertiesPanelManifest } from "@simple/panel";
import { propiedadesAuthCopy } from '@/config/authCopy';
import { PROPERTIES_BRANDING } from '@/config/branding';
import { usePathname } from "next/navigation";

interface LayoutContentProps {
  children: React.ReactNode;
  showNotifications?: boolean;
}

export function LayoutContent({
  children,
  showNotifications = true,
}: LayoutContentProps) {
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const hideChrome =
    !!pathname &&
    (pathname.startsWith("/reset") || pathname.startsWith("/auth/confirm") || pathname.startsWith("/forgot"));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set once post-hydration to avoid SSR mismatches
    setMounted(true);
  }, [setMounted]);

  const handleLogout = async () => {
    await signOut();
  };

  if (!mounted) {
    return (
      <>
        <AuthCallbackToasts redirectTo="/panel" />
        <AuthModalMount copy={propiedadesAuthCopy} />
        {hideChrome ? <>{children}</> : <div className="mt-[10px]">{children}</div>}
      </>
    );
  }

  return (
    <>
      <AuthCallbackToasts redirectTo="/panel" />
      <AuthModalMount copy={propiedadesAuthCopy} />
      {hideChrome ? (
        <>{children}</>
      ) : (
        <>
          <Header
            vertical="properties"
            user={user}
            loading={loading}
            onLogout={handleLogout}
            NotificationComponent={NotificationsBell}
            showNotifications={showNotifications}
            panelManifest={propertiesPanelManifest}
            brandLogo={{
              light: PROPERTIES_BRANDING.logos.light,
              dark: PROPERTIES_BRANDING.logos.dark,
              color: PROPERTIES_BRANDING.logos.color,
              alt: PROPERTIES_BRANDING.appName,
            }}
          />
          {/* Mantener todo el contenido 10px por debajo del header */}
          <div className="mt-[10px]">{children}</div>
          <Footer
            vertical="properties"
            contactInfo={{
              location: 'Santiago, Chile',
              phone: PROPERTIES_BRANDING.supportWhatsAppDisplay,
              email: PROPERTIES_BRANDING.supportEmail,
            }}
            socialLinks={{
              instagram: `https://instagram.com/${PROPERTIES_BRANDING.domain}`,
              tiktok: `https://tiktok.com/@${PROPERTIES_BRANDING.domain}`,
              facebook: `https://facebook.com/${PROPERTIES_BRANDING.domain}`,
              whatsapp: `https://wa.me/${PROPERTIES_BRANDING.supportWhatsAppDigits}`,
              youtube: `https://youtube.com/@${PROPERTIES_BRANDING.domain}`,
            }}
            brandLogo={{
              light: PROPERTIES_BRANDING.logos.light,
              dark: PROPERTIES_BRANDING.logos.dark,
              color: PROPERTIES_BRANDING.logos.color,
              alt: PROPERTIES_BRANDING.appName,
            }}
          />
        </>
      )}
    </>
  );
}
