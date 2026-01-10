"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PanelShell, PanelSidebar } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";
import { autosPanelManifest } from "@simple/panel";

function PanelLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

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
          vertical="autos"
          manifest={autosPanelManifest}
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









