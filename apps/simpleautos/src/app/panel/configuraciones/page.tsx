"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, PanelPageLayout, Select, Textarea, useToast } from "@simple/ui";
import { IconBrandInstagram, IconLogout, IconPlug } from "@tabler/icons-react";
import { useSupabase } from "@/lib/supabase/useSupabase";

type InstagramHistoryItem = {
  id: string;
  mediaId: string | null;
  permalink: string | null;
  status: string;
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export default function Configuraciones() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const supabase = useSupabase();
  const [notifEmail, setNotifEmail] = React.useState(true);
  const [notifPush, setNotifPush] = React.useState(false);
  const [lang, setLang] = React.useState("es");
  const [feedback, setFeedback] = React.useState("");
  const [feedbackType, setFeedbackType] = React.useState("suggestion");

  const instagramEnabled = String(process.env.NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH || "").toLowerCase() === "true";
  const [igStatus, setIgStatus] = React.useState<{ connected: boolean; ig_username?: string | null; page_name?: string | null }>({
    connected: false,
  });
  const [igHistory, setIgHistory] = React.useState<InstagramHistoryItem[]>([]);
  const [igHistoryLoading, setIgHistoryLoading] = React.useState(false);

  const loadInstagramHistory = React.useCallback(async () => {
    if (!instagramEnabled) return;
    try {
      setIgHistoryLoading(true);
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      const res = await fetch("/api/instagram/history?vertical=autos&limit=10", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.items) ? json.items : [];
      setIgHistory(
        items.map((item: any) => ({
          id: String(item?.id || ""),
          mediaId: item?.mediaId ? String(item.mediaId) : null,
          permalink: item?.permalink ? String(item.permalink) : null,
          status: item?.status ? String(item.status) : "queued",
          error: item?.error ? String(item.error) : null,
          publishedAt: item?.publishedAt ? String(item.publishedAt) : null,
          createdAt: item?.createdAt ? String(item.createdAt) : new Date().toISOString(),
        }))
      );
    } catch {
      setIgHistory([]);
    } finally {
      setIgHistoryLoading(false);
    }
  }, [instagramEnabled, supabase]);

  const loadInstagram = React.useCallback(async () => {
    if (!instagramEnabled) return;
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      const res = await fetch("/api/instagram/status", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        cache: "no-store",
      });
      const json = await res.json();
      setIgStatus({
        connected: !!json?.connected,
        ig_username: json?.ig_username ?? null,
        page_name: json?.page_name ?? null,
      });
    } catch {
      setIgStatus({ connected: false });
    }
  }, [instagramEnabled, supabase]);

  React.useEffect(() => {
    loadInstagram();
  }, [loadInstagram]);

  React.useEffect(() => {
    loadInstagramHistory();
  }, [loadInstagramHistory]);

  React.useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const reason = searchParams.get("reason") || "";
    if (connected === "instagram") {
      addToast("Instagram conectado", { type: "success" });
      loadInstagram();
      loadInstagramHistory();
      router.replace("/panel/configuraciones#integraciones");
      return;
    }
    if (error === "instagram") {
      const reasonMap: Record<string, string> = {
        missing_code: "No se recibió el código de autorización.",
        invalid_state: "Sesión expirada o inválida. Intenta nuevamente.",
        not_logged_in: "Debes iniciar sesión en SimpleAutos antes de conectar.",
        token_exchange_failed: "No pudimos completar la conexión con Meta. Intenta nuevamente.",
        pages_fetch_failed: "No se pudieron leer tus Páginas de Facebook.",
        no_pages_access: "Tu usuario no tiene acceso a ninguna Página de Facebook en esta app.",
        page_not_allowed: "La página configurada no fue autorizada durante el login de Facebook.",
        no_instagram_account_linked: "No encontramos un Instagram profesional vinculado a una Página.",
        meta_not_configured: "La integración no está disponible temporalmente.",
        supabase_admin_not_configured: "La integración no está disponible temporalmente.",
        integration_upsert_failed: "No se pudo guardar la conexión. Intenta nuevamente.",
        provider_upsert_failed: "No se pudo guardar la conexión. Intenta nuevamente.",
      };

      const errorMessage = reasonMap[reason] || "No se pudo conectar Instagram";
      addToast(errorMessage, { type: "error" });
      router.replace("/panel/configuraciones#integraciones");
    }
  }, [searchParams, addToast, router, loadInstagram, loadInstagramHistory]);

  const connectInstagram = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        addToast("Debes iniciar sesión para conectar Instagram", { type: "error" });
        router.push("/login?next=/panel/configuraciones#integraciones");
        return;
      }

      const res = await fetch("/api/instagram/oauth/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) {
        addToast(json?.error || "No se pudo iniciar la conexión", { type: "error" });
        return;
      }

      window.location.href = String(json.url);
    } catch (e: any) {
      addToast(e?.message || "No se pudo iniciar la conexión", { type: "error" });
    }
  };

  const disconnectInstagram = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!res.ok) throw new Error("No se pudo desconectar");
      addToast("Instagram desconectado", { type: "success" });
      await loadInstagram();
      await loadInstagramHistory();
    } catch (e: any) {
      addToast(e?.message || "Error al desconectar Instagram", { type: "error" });
    }
  };

  const historyStatusLabel = (status: string) => {
    if (status === "published") return "Publicado";
    if (status === "retrying") return "Reintento";
    if (status === "processing") return "Procesando";
    if (status === "failed") return "Fallido";
    return "En cola";
  };

  const handleFeedbackSubmit = () => {
    // Aquí se podría enviar a una API o Supabase
    alert("¡Gracias por tu feedback! Lo revisaremos pronto.");
    setFeedback("");
  };

  return (
    <PanelPageLayout
      header={{
        title: "Configuraciones",
        description: "Ajusta tus preferencias y notificaciones."
      }}
    >
      <div id="integraciones" className="card-surface shadow-card p-6 space-y-6 max-w-3xl mt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Integraciones</h2>
            <p className="text-sm text-lighttext/70 dark:text-darktext/70">Conecta canales para publicar y recibir leads.</p>
          </div>
        </div>

        {instagramEnabled ? (
          <div className="rounded-2xl border border-[var(--field-border)] p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    igStatus.connected ? "bg-[var(--color-success-subtle-bg)]" : "bg-[var(--field-bg)] dark:bg-darkbg"
                  }`}
                >
                  <IconBrandInstagram
                    size={24}
                    className={igStatus.connected ? "text-[var(--color-success)]" : "text-lighttext/60 dark:text-darktext/60"}
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-lighttext dark:text-darktext">Instagram</div>
                  <div className="text-xs text-lighttext/70 dark:text-darktext/70">
                    {igStatus.connected ? "Conectado" : "Sin conectar"}
                    {igStatus.ig_username ? ` · @${igStatus.ig_username}` : ""}
                    {igStatus.page_name ? ` · ${igStatus.page_name}` : ""}
                  </div>
                  <div className="text-xs text-lighttext/60 dark:text-darktext/60 mt-1">
                    Requiere cuenta Profesional vinculada a una Página de Facebook.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {igStatus.connected ? (
                  <Button variant="ghost" size="md" onClick={disconnectInstagram}>
                    <IconLogout size={18} className="mr-2" /> Desconectar
                  </Button>
                ) : (
                  <Button variant="primary" size="md" onClick={connectInstagram}>
                    <IconPlug size={18} className="mr-2" /> Conectar
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[var(--field-bg)]/50 border border-[var(--field-border)] overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-lighttext dark:text-darktext">Historial Instagram</div>
                  <div className="text-xs text-lighttext/65 dark:text-darktext/65">Estado y fecha de publicaciones</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadInstagramHistory}>Actualizar</Button>
                </div>
              </div>

              {igHistoryLoading ? (
                <div className="px-4 py-3 text-sm text-lighttext/70 dark:text-darktext/70">Cargando historial...</div>
              ) : igHistory.length === 0 ? (
                <div className="px-4 py-3 text-sm text-lighttext/70 dark:text-darktext/70">Aún no hay publicaciones registradas.</div>
              ) : (
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-lighttext/60 dark:text-darktext/60 border-t border-[var(--field-border)]">
                      <tr>
                        <th className="px-4 py-2 font-medium">Fecha</th>
                        <th className="px-4 py-2 font-medium">Media ID</th>
                        <th className="px-4 py-2 font-medium">Permalink</th>
                        <th className="px-4 py-2 font-medium">Estado</th>
                        <th className="px-4 py-2 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {igHistory.map((item) => (
                        <tr key={item.id} className="border-t border-[var(--field-border)]/60">
                          <td className="px-4 py-2 text-lighttext/80 dark:text-darktext/80">
                            {new Date(item.publishedAt || item.createdAt).toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-lighttext dark:text-darktext">
                            {item.mediaId || "—"}
                          </td>
                          <td className="px-4 py-2">
                            {item.permalink ? (
                              <a
                                className="text-primary hover:underline"
                                href={item.permalink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Ver post
                              </a>
                            ) : (
                              <span className="text-lighttext/60 dark:text-darktext/60">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-lighttext dark:text-darktext">
                            {historyStatusLabel(item.status)}
                          </td>
                          <td className="px-4 py-2 text-lighttext/70 dark:text-darktext/70 max-w-[280px] truncate" title={item.error || ""}>
                            {item.error || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--field-border)] p-4">
          <div className="text-sm font-semibold text-lighttext dark:text-darktext">Marketplaces</div>
          <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Chileautos y Yapo (próximamente).</div>
        </div>
      </div>

      <div className="card-surface shadow-card p-6 space-y-6 max-w-3xl mt-8">
        <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Configuraciones</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-lighttext dark:text-darktext">
            <input
              type="checkbox"
              checked={notifEmail}
              onChange={(e) => setNotifEmail(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-[var(--field-border)] bg-[var(--field-bg)] text-primary focus:ring-0"
            />
            Notificaciones por email
          </label>
          <label className="flex items-center gap-3 text-lighttext dark:text-darktext">
            <input
              type="checkbox"
              checked={notifPush}
              onChange={(e) => setNotifPush(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-[var(--field-border)] bg-[var(--field-bg)] text-primary focus:ring-0"
            />
            Notificaciones push
          </label>
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Idioma</span>
            <Select
              options={[
                { value: "es", label: "Espanol" },
                { value: "en", label: "English" },
              ]}
              value={lang}
              onChange={(v) => setLang(String(v))}
            />
          </div>
        </div>
        <Button variant="primary" size="md">Guardar</Button>
      </div>

      <div className="card-surface shadow-card p-6 space-y-6 max-w-3xl mt-8">
        <h2 className="text-2xl font-bold text-lighttext dark:text-darktext">Feedback</h2>
        <p className="text-lighttext dark:text-darktext">Ayudanos a mejorar compartiendo tus sugerencias o reportando problemas.</p>
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Tipo de feedback</span>
            <Select
              options={[
                { value: "suggestion", label: "Sugerencia" },
                { value: "bug", label: "Reporte de error" },
                { value: "feature", label: "Nueva funcionalidad" },
                { value: "other", label: "Otro" },
              ]}
              value={feedbackType}
              onChange={(v) => setFeedbackType(String(v))}
            />
          </div>
          <div className="space-y-1">
            <span className="block text-sm text-lighttext dark:text-darktext">Mensaje</span>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe tu feedback aqui..."
              rows={4}
            />
          </div>
        </div>
        <Button variant="primary" size="md" onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>Enviar Feedback</Button>
      </div>
    </PanelPageLayout>
  );
}







