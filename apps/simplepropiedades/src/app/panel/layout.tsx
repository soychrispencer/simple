"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@simple/auth";
import { PanelShell, PanelSidebar } from "@simple/ui";
import { propertiesPanelManifest } from "@simple/panel";

function PanelLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center text-lg">Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <PanelShell
      sidebar={({ expanded, setExpanded }) => (
        <PanelSidebar
          vertical="properties"
          manifest={propertiesPanelManifest}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
      initialSidebarExpanded={false}
    >
      {children}
    </PanelShell>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayoutInner>{children}</PanelLayoutInner>;
}
