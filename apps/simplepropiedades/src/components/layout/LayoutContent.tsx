"use client";
import { Header, Footer, NotificationsBell, AuthModalMount } from "@simple/ui";
import { useAuth } from '@simple/auth';
import { useEffect, useState } from 'react';
import { propertiesPanelManifest } from "@simple/panel";
import { propiedadesAuthCopy } from '@/config/authCopy';

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- set once post-hydration to avoid SSR mismatches
    setMounted(true);
  }, [setMounted]);

  const handleLogout = async () => {
    await signOut();
  };

  if (!mounted) {
    return (
      <div className="mt-[10px]">{children}</div>
    );
  }

  return (
    <>
      <Header
        vertical="properties"
        user={user}
        loading={loading}
        onLogout={handleLogout}
        NotificationComponent={NotificationsBell}
        showNotifications={showNotifications}
        panelManifest={propertiesPanelManifest}
      />
      <AuthModalMount copy={propiedadesAuthCopy} />
      {/* Mantener todo el contenido 10px por debajo del header */}
      <div className="mt-[10px]">{children}</div>
      <Footer vertical="properties" />
    </>
  );
}