"use client";

import { Header, Footer, NotificationsBell, AuthModalMount, AuthCallbackToasts } from "@simple/ui";
import { useAuth } from "@simple/auth";
import { storesPanelManifest } from "@simple/panel";
import { tiendasAuthCopy } from "@/config/authCopy";
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
  const pathname = usePathname();

  const hideChrome =
    !!pathname &&
    (pathname.startsWith("/reset") || pathname.startsWith("/auth/confirm") || pathname.startsWith("/forgot"));

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <AuthCallbackToasts redirectTo="/panel" />
      <AuthModalMount copy={tiendasAuthCopy} />
      {hideChrome ? (
        <>{children}</>
      ) : (
        <>
          <Header
            vertical="stores"
            user={user}
            loading={loading}
            onLogout={handleLogout}
            NotificationComponent={NotificationsBell}
            showNotifications={showNotifications}
            panelManifest={storesPanelManifest}
          />
          {children}
          <Footer vertical="stores" />
        </>
      )}
    </>
  );
}
