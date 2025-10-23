"use client";

import Sidebar from "@/components/panel/Sidebar";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";


function PanelLayoutInner({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center text-lg">Cargando...</div>;
  }
  if (!user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-lightbg dark:bg-darkbg flex flex-row">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <div className={`flex-1 flex flex-col transition-all duration-200`}>
        <main className="flex-1 px-4 md:px-8 pb-4 md:pb-8">{children}</main>
      </div>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayoutInner>{children}</PanelLayoutInner>;
}


