"use client";

import { Header, Footer, NotificationsBell, AuthModalMount } from "@simple/ui";
import { useAuth } from "@simple/auth";
import { storesPanelManifest } from "@simple/panel";
import { tiendasAuthCopy } from "@/config/authCopy";

interface LayoutContentProps {
  children: React.ReactNode;
  showNotifications?: boolean;
}

export function LayoutContent({
  children,
  showNotifications = true,
}: LayoutContentProps) {
  const { user, loading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
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
      <AuthModalMount copy={tiendasAuthCopy} />
      <div className="mt-[10px]">{children}</div>
      <Footer vertical="stores" />
    </>
  );
}
