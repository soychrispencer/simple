"use client";
import React from "react";
import PanelHeader from "@/components/panel/PanelHeader";

interface HeaderConfig {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode; // zona inferior del header (tabs, filtros, progress)
}

interface PanelPageLayoutProps {
  header?: HeaderConfig;
  children: React.ReactNode;
  className?: string;
  fullBleed?: boolean; // elimina padding lateral si alguna p�gina lo necesita
}

/**
 * Layout estandarizado para p�ginas dentro de /panel.
 * Centraliza spacing vertical y opcionalmente renderiza un PanelHeader.
 */
export default function PanelPageLayout({ header, children, className, fullBleed = false }: PanelPageLayoutProps) {
  return (
    <div className={["w-full space-y-6", !fullBleed && "", className].filter(Boolean).join(" ")}> {/* padding lateral puede controlarse a nivel superior */}
      {header && (
        <PanelHeader
          title={header.title}
          description={header.description}
          actions={header.actions}
        >
          {header.children}
        </PanelHeader>
      )}
      {children}
    </div>
  );
}







