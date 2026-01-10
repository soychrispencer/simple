"use client";

import React from "react";
import { Button, PanelPageLayout } from "@simple/ui";
import { CompanyManager } from "@simple/profile";
import { useAuth } from "@/context/AuthContext";
import { IconPlus, IconBuildingStore } from "@tabler/icons-react";

export default function EmpresasPage() {
  const { user } = useAuth();
  const [showManager, setShowManager] = React.useState(false);
  const [autoOpenCreate, setAutoOpenCreate] = React.useState(false);


  return (
    <PanelPageLayout
      header={{
        title: "Mi Negocio",
        description: "Administra tu negocio en Simple: datos, contactos y accesos."
      }}
    >
      <section className="w-full mt-6 card-surface shadow-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-primary shrink-0">
            <IconBuildingStore size={22} stroke={1.5} />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-base font-semibold text-lighttext dark:text-darktext">Gestiona uno o varios negocios vinculados a tu cuenta.</h3>
          </div>
        </div>

        {!showManager && (
          <div className="rounded-xl border border-dashed border-border/70 bg-lightbg/60 dark:bg-darkbg/40 p-4 text-sm text-lighttext/80 dark:text-darktext/80 space-y-3">
            <p>Aún no tienes negocios. Agrega el primero para habilitar tu perfil.</p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAutoOpenCreate(true);
                  setShowManager(true);
                }}
                leftIcon={<IconPlus size={18} stroke={1.5} />}
              >
                Agregar negocio
              </Button>
            </div>
          </div>
        )}

        {showManager && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="neutral"
                size="sm"
                onClick={() => {
                  setShowManager(false);
                  setAutoOpenCreate(false);
                }}
              >
                Cerrar
              </Button>
            </div>
            <CompanyManager userId={user?.id || user?.user_id} autoOpenCreate={autoOpenCreate} />
          </div>
        )}
      </section>
    </PanelPageLayout>
  );
}
