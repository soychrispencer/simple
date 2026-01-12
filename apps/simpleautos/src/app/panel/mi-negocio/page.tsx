"use client";

import React from "react";
import { Button, PanelPageLayout } from "@simple/ui";
import { CompanyManager } from "@simple/profile";
import { useAuth } from "@/context/AuthContext";
import { IconPlus, IconBuildingStore, IconEye, IconLock, IconPencil, IconLink } from "@tabler/icons-react";
import { usePanelCapabilities } from "@/lib/panelCapabilities";

export default function EmpresasPage() {
  const { user } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = usePanelCapabilities();
  const [showManager, setShowManager] = React.useState(false);
  const [autoOpenCreate, setAutoOpenCreate] = React.useState(false);

  const isPlaceholderUsername = React.useCallback((value?: string | null) => {
    if (!value) return false;
    const v = value.trim();
    return /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }, []);

  const cleanedPublicSlug = !isPlaceholderUsername((user as any)?.public_profile?.slug)
    ? String((user as any)?.public_profile?.slug || "")
    : "";
  const cleanedUserUsername = !isPlaceholderUsername((user as any)?.username)
    ? String((user as any)?.username || "")
    : "";
  const effectiveUsername = (cleanedPublicSlug || cleanedUserUsername).trim().toLowerCase();
  const publicUrl = effectiveUsername ? `/perfil/${effectiveUsername}` : "";

  const hasBusiness = capabilities?.hasBusiness ?? false;
  const canUsePublicPage = capabilities?.hasPublicPage ?? false;


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

      {!capabilitiesLoading && hasBusiness && (
        <section className="w-full mt-6 card-surface shadow-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-primary shrink-0">
                <IconEye size={22} stroke={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-lighttext dark:text-darktext">Vista previa de tu página pública</h3>
                <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                  Así te verán los clientes. Útil para compartir tu negocio y generar confianza.
                </p>
              </div>
            </div>
          </div>

          {canUsePublicPage ? (
            <div className="rounded-xl border border-border/60 bg-lightbg/60 dark:bg-darkbg/40 p-4 space-y-3">
              {publicUrl ? (
                <>
                  <div className="text-sm text-lighttext/80 dark:text-darktext/80">
                    URL pública: <span className="font-medium text-lighttext dark:text-darktext">{publicUrl}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="neutral"
                      size="sm"
                      leftIcon={<IconLink size={16} stroke={1.5} />}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Copiar link
                    </Button>
                    <Button
                      variant="neutral"
                      size="sm"
                      leftIcon={<IconEye size={16} stroke={1.5} />}
                      onClick={() => window.open(publicUrl, "_blank")}
                    >
                      Ver
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<IconPencil size={16} stroke={1.5} />}
                      onClick={() => {
                        window.location.href = "/panel/mi-pagina";
                      }}
                    >
                      Editar mi página
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-lighttext/80 dark:text-darktext/80">
                    Aún no tienes un nombre de página configurado.
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<IconPencil size={16} stroke={1.5} />}
                      onClick={() => {
                        window.location.href = "/panel/mi-pagina";
                      }}
                    >
                      Configurar mi página
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative rounded-xl border border-border/60 bg-lightbg/60 dark:bg-darkbg/40 p-4 overflow-hidden">
              <div className="space-y-2 opacity-60 blur-[1px] select-none pointer-events-none">
                <div className="h-4 w-40 bg-border/40 rounded" />
                <div className="h-4 w-64 bg-border/40 rounded" />
                <div className="h-24 w-full bg-border/30 rounded" />
              </div>

              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-xl card-surface shadow-card p-4 border border-border/60">
                  <div className="flex items-center gap-2 text-lighttext dark:text-darktext font-semibold">
                    <IconLock size={18} stroke={1.5} />
                    Disponible en Pro
                  </div>
                  <div className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
                    Activa tu plan para crear tu página pública y compartir tu negocio con clientes.
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        window.location.href = "/panel/mis-suscripciones";
                      }}
                    >
                      Activar Pro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </PanelPageLayout>
  );
}
