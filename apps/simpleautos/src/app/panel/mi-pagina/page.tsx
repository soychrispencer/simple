"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PanelPageLayout, Input } from "@simple/ui";
import { Button, ProfileCoverUploader, useToast } from "@simple/ui";
import PublicPageForm from "@/components/panel/perfil/PublicPageForm";
import { useAuth } from "@/context/AuthContext";
import { IconEye, IconCheck, IconX, IconLoader, IconCircleCheck } from "@tabler/icons-react";
import { logError } from "@/lib/logger";

export default function PaginaPage() {
  const { user, profile, refresh: refreshAuth, loading, supabase } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [coverCropOpen, setCoverCropOpen] = React.useState(false);

  const [activePlanKey, setActivePlanKey] = React.useState<string>(() =>
    String((profile as any)?.plan_key ?? 'free')
  );

  React.useEffect(() => {
    let cancelled = false;

    async function loadPlanKey() {
      if (!supabase || !user?.id) return;

      const { data: vehiclesVertical } = await supabase
        .from('verticals')
        .select('id')
        .eq('key', 'vehicles')
        .maybeSingle();

      const vehiclesVerticalId = (vehiclesVertical as any)?.id as string | undefined;

      let subQuery = supabase
        .from('subscriptions')
        .select('status, subscription_plans(plan_key)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (vehiclesVerticalId) {
        subQuery = subQuery.eq('vertical_id', vehiclesVerticalId);
      }

      const { data: activeSub } = await subQuery.maybeSingle();
      const planSource = Array.isArray((activeSub as any)?.subscription_plans)
        ? (activeSub as any)?.subscription_plans?.[0]
        : (activeSub as any)?.subscription_plans;
      const planKey = String(planSource?.plan_key ?? 'free');

      if (!cancelled) setActivePlanKey(planKey);
    }

    void loadPlanKey();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const planKey = activePlanKey || String((profile as any)?.plan_key ?? 'free');
  const canUsePublicPage = planKey !== 'free';

  const isPlaceholderUsername = React.useCallback((value?: string | null) => {
    if (!value) return false;
    const v = value.trim();
    return /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }, []);

  const cleanedPublicSlug = !isPlaceholderUsername(user?.public_profile?.slug)
    ? (user?.public_profile?.slug || "")
    : "";
  const cleanedUserUsername = !isPlaceholderUsername(user?.username) ? (user?.username || "") : "";
  const initialSlug = cleanedPublicSlug || cleanedUserUsername || "";
  const [usernameInput, setUsernameInput] = React.useState(initialSlug);
  const [usernameStatus, setUsernameStatus] = React.useState<
    "idle" | "checking" | "available" | "unavailable"
  >(initialSlug ? "available" : "idle");
  const [usernameMessage, setUsernameMessage] = React.useState<string | null>(null);
  const [availableUsername, setAvailableUsername] = React.useState<string | null>(initialSlug || null);
  const [creatingPage, setCreatingPage] = React.useState(false);
  const [showBuilder, setShowBuilder] = React.useState(Boolean(initialSlug || user?.public_profile?.id));

  React.useEffect(() => {
    if (!loading && !user?.id) {
      router.replace("/");
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    const hasPublicProfile = Boolean(user?.public_profile?.id);
    const slug = cleanedPublicSlug || cleanedUserUsername || availableUsername;
    if (slug) {
      setUsernameInput(slug);
      setUsernameStatus("available");
      setUsernameMessage(null);
      setAvailableUsername(slug);
    } else {
      setUsernameStatus("idle");
      setUsernameMessage(null);
      setAvailableUsername(null);
    }

    // Si ya existe perfil público, mostramos builder aunque el slug sea placeholder
    setShowBuilder(Boolean(slug) || hasPublicProfile);
  }, [availableUsername, cleanedPublicSlug, cleanedUserUsername, isPlaceholderUsername, user?.public_profile?.id, user?.public_profile?.slug, user?.username]);

  // Al montar, si no hay username en el user, consulta el perfil público para restaurar el slug
  React.useEffect(() => {
    async function restoreSlug() {
      if (!user?.id) return;
      // Si ya tenemos un slug real en memoria, no hacemos nada
      if (cleanedPublicSlug || cleanedUserUsername) return;
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, slug")
        .eq("owner_profile_id", user.id)
        .maybeSingle();

      if (error || !data?.id) return;
      setShowBuilder(true);

      const dbSlug = (data as any)?.slug as string | null | undefined;
      if (!dbSlug || isPlaceholderUsername(dbSlug)) return;
      setAvailableUsername(dbSlug);
      setUsernameInput(dbSlug);
      setUsernameStatus("available");
      setUsernameMessage(null);
    }
    restoreSlug();
  }, [cleanedPublicSlug, cleanedUserUsername, isPlaceholderUsername, supabase, user?.id, user?.public_profile?.slug, user?.username]);

  const handleCheckUsername = React.useCallback(async () => {
    const candidate = usernameInput.trim().toLowerCase();
    const isValid = /^[a-z0-9._-]{3,20}$/.test(candidate);

    if (!candidate || !isValid) {
      setUsernameStatus("unavailable");
      setUsernameMessage("Usa 3-20 caracteres: letras, números, . _ -");
      setAvailableUsername(null);
      return;
    }

    if (!supabase) {
      setUsernameStatus("unavailable");
      setUsernameMessage("No pudimos validar ahora. Intenta de nuevo.");
      setAvailableUsername(null);
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage(null);
    setAvailableUsername(null);

    try {
      let query = supabase
        .from("public_profiles")
        .select("id, owner_profile_id")
        .eq("slug", candidate)
        .limit(1);

      if (user?.id) {
        query = query.neq("owner_profile_id", user.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        logError("Username check error", error);
        setUsernameStatus("unavailable");
        setUsernameMessage("No pudimos validar ahora. Intenta de nuevo.");
        return;
      }

      if (data) {
        setUsernameStatus("unavailable");
        setUsernameMessage("Nombre de usuario no disponible.");
      } else {
        setUsernameStatus("available");
        setUsernameMessage("Nombre disponible. Crea tu página para usarlo.");
        setAvailableUsername(candidate);
      }
    } catch (err) {
      logError("Username check exception", err);
      setUsernameStatus("unavailable");
      setUsernameMessage("No pudimos validar ahora. Intenta de nuevo.");
    }
  }, [supabase, user?.id, usernameInput]);

  const usernameIcon = usernameStatus === "available"
    ? <IconCheck size={16} className="text-[var(--color-success)]" />
    : usernameStatus === "unavailable"
      ? <IconX size={16} className="text-[var(--color-warn)]" />
      : usernameStatus === "checking"
        ? <IconLoader size={16} className="animate-spin text-primary" />
        : null;

  const effectiveUsername = React.useMemo(() => {
    const slug = cleanedPublicSlug || cleanedUserUsername || availableUsername || usernameInput;
    return slug ? slug.trim().toLowerCase() : "";
  }, [availableUsername, cleanedPublicSlug, cleanedUserUsername, usernameInput]);

  const handleStartBuilder = React.useCallback(async () => {
    const hasRealUsername = !!user?.username && !isPlaceholderUsername(user?.username);
    if ((usernameStatus !== "available" && !hasRealUsername) || creatingPage) return;
    if (!supabase || !user?.id) return;

    const slug = ((hasRealUsername ? user?.username : "") || availableUsername || usernameInput).trim().toLowerCase();
    if (!slug) return;

    try {
      setCreatingPage(true);
      const { data: existing, error: fetchError } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("owner_profile_id", user.id)
        .maybeSingle();
      if (fetchError) throw new Error(fetchError.message);

      if (!existing?.id) {
        const { error: insertError } = await supabase
          .from("public_profiles")
          .insert({ owner_profile_id: user.id, profile_type: "business", slug })
          .select("id")
          .single();
        if (insertError) throw new Error(insertError.message);
      } else {
        const { error: updateError } = await supabase
          .from("public_profiles")
          .update({ slug })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
      }

      setShowBuilder(true);
      addToast("Nombre guardado. Ya puedes completar tu página.", { type: "success" });
      await refreshAuth(true);
    } catch (err) {
      logError("create page (slug) error", err);
      addToast("No pudimos guardar el nombre. Intenta nuevamente.", { type: "error" });
    } finally {
      setCreatingPage(false);
    }
  }, [addToast, availableUsername, creatingPage, isPlaceholderUsername, refreshAuth, supabase, user?.id, user?.username, usernameInput, usernameStatus]);

  const handleViewPage = React.useCallback(() => {
    if (!effectiveUsername) return;
    const url = `/perfil/${effectiveUsername}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    } else {
      router.push(url);
    }
  }, [effectiveUsername, router]);

  const handlePageSave = React.useCallback(() => {
    addToast("Página pública actualizada.", { type: "success" });
    refreshAuth(true);
  }, [addToast, refreshAuth]);

  return (
    <PanelPageLayout
      header={{
        title: "Mi Página",
        description: "Activa y edita tu página pública para compartirla.",
        actions: (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewPage}
            disabled={!effectiveUsername || !canUsePublicPage}
            className="flex items-center gap-2"
          >
            <IconEye size={18} stroke={1.5} />
            Ver pagina
          </Button>
        ),
      }}
    >
      {!canUsePublicPage ? (
        <section className="w-full mt-8">
          <div className="card-surface rounded-3xl overflow-hidden shadow-card text-lighttext dark:text-darktext">
            <div className="p-6 sm:p-8 flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Disponible en Pro</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                La página pública (vitrina del vendedor) se activa con el plan Pro.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/panel/mis-suscripciones')}
                >
                  Activar Pro
                </Button>
                <Button variant="neutral" size="md" onClick={() => router.push('/panel')}>
                  Volver al panel
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {!showBuilder ? (
            <section className="w-full mt-8">
              <div className="card-surface rounded-3xl overflow-hidden shadow-card text-lighttext dark:text-darktext">
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full card-surface shadow-card text-lighttext/80 dark:text-darktext/80 text-xs uppercase tracking-wide">
                        Mi negocio
                      </div>
                      <h2 className="text-2xl font-semibold leading-tight">Activa tu página pública en segundos</h2>
                      <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                        Elige tu nombre de usuario único para compartir tu perfil, subir portada y mostrar tus horarios.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-lighttext/80 dark:text-darktext/80">Nombre de usuario</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 flex items-center gap-2 rounded-xl card-surface shadow-card px-3 py-2">
                        <span className="text-sm text-lighttext/70 dark:text-darktext/70">simpleautos.app/perfil/</span>
                        <Input
                          value={usernameInput}
                          onChange={(e) => {
                            setUsernameInput(e.target.value);
                            setUsernameStatus("idle");
                            setUsernameMessage(null);
                            if (!user?.username) {
                              setAvailableUsername(null);
                              setShowBuilder(false);
                            }
                          }}
                          onBlur={handleCheckUsername}
                          placeholder="tu-negocio"
                          className="flex-1 !border-0 !bg-transparent !shadow-none !ring-0 px-0"
                        />
                        {usernameIcon}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          onClick={handleCheckUsername}
                          disabled={usernameStatus === "checking" || usernameInput.trim().length < 3}
                        >
                          {usernameStatus === "checking" ? "Verificando..." : "Ver disponibilidad"}
                        </Button>
                        {usernameStatus === "available" ? (
                          <Button variant="primary" onClick={handleStartBuilder} disabled={creatingPage}>
                            {creatingPage ? "Creando..." : "Crear pagina"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {usernameMessage ? (
                      <p
                        className={`text-xs ${
                          usernameStatus === "available"
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-warn)]"
                        }`}
                      >
                        {usernameMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-lighttext/60 dark:text-darktext/60">
                        3-20 caracteres. Letras, números, puntos, guiones y guion bajo.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-lighttext/80 dark:text-darktext/80">
                    <div className="flex items-center gap-2 card-surface shadow-card rounded-xl px-3 py-2">
                      <IconCircleCheck size={16} className="text-[var(--color-success)]" />
                      Reserva tu enlace único
                    </div>
                    <div className="flex items-center gap-2 card-surface shadow-card rounded-xl px-3 py-2">
                      <IconCircleCheck size={16} className="text-[var(--color-success)]" />
                      Sube portada y avatar
                    </div>
                    <div className="flex items-center gap-2 card-surface shadow-card rounded-xl px-3 py-2">
                      <IconCircleCheck size={16} className="text-[var(--color-success)]" />
                      Horarios y contacto visibles
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {showBuilder ? (
            <>
              <section
                className="relative w-full aspect-[32/10] md:aspect-[32/9] overflow-hidden group shadow-card card-surface rounded-[var(--card-radius)] mt-6"
              >
                <ProfileCoverUploader cropOpen={coverCropOpen} setCropOpen={setCoverCropOpen} />
              </section>

              <section className="w-full mt-8">
                <PublicPageForm
                  user={{
                    ...user,
                    // Pasamos el username efectivo solo si es válido; si es placeholder, dejamos vacío
                    username: effectiveUsername,
                    user_id: user?.user_id || user?.id,
                  }}
                  onSave={handlePageSave}
                  coverModalOpen={coverCropOpen}
                />
              </section>
            </>
          ) : null}
        </>
      )}
    </PanelPageLayout>
  );
}
