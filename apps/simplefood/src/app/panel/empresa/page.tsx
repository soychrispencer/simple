"use client";

import React from "react";
import { PanelPageLayout } from "@simple/ui";
import { IconBuildingStore, IconUsersGroup, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "@simple/auth";
import { CompanyManager } from "@simple/profile";

export default function EmpresaPage() {
  const { user } = useAuth();
  const companyName = user?.empresa?.legal_name || user?.empresa?.name;
  const isCompany = Boolean(user?.empresa?.id);

  return (
    <PanelPageLayout
      header={{
        title: "Mi Negocio",
        description: "Gestiona datos legales, contactos y facturación de tu negocio gastronómico.",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm mb-6">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconBuildingStore size={16} className="text-primary" />
          {companyName ? `Negocio activo: ${companyName}` : "Sin negocio"}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconUsersGroup size={16} className="text-primary" />
          {isCompany ? "Cuenta con negocio" : "Cuenta individual"}
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg card-surface">
          <IconCircleCheck size={16} className="text-primary" />
          Gestión de múltiples negocios
        </span>
      </div>
      <CompanyManager userId={user?.id || user?.user_id} />
    </PanelPageLayout>
  );
}
