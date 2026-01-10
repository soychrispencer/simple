"use client";
import React from "react";
import PanelHeader from "./PanelHeader";

interface HeaderConfig {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export interface PanelPageLayoutProps {
  header?: HeaderConfig & { actions?: React.ReactNode; children?: React.ReactNode };
  children: React.ReactNode;
  className?: string;
  fullBleed?: boolean;
}

export default function PanelPageLayout({ header, children, className, fullBleed = false }: PanelPageLayoutProps) {
  return (
    <div className={["w-full space-y-6", !fullBleed && "", className].filter(Boolean).join(" ")}
    >
      {header && (
        <PanelHeader
          title={header.title}
          description={header.description}
          actions={header.actions}
          compact={header.compact}
          className={header.className}
        >
          {header.children}
        </PanelHeader>
      )}
      {children}
    </div>
  );
}
