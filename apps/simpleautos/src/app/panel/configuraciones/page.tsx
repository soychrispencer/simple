"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, PanelPageLayout, Select, Textarea, useToast } from "@simple/ui";
import { IconBrandInstagram, IconLogout, IconPlug } from "@tabler/icons-react";

export default function Configuraciones() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [notifEmail, setNotifEmail] = React.useState(true);
  const [notifPush, setNotifPush] = React.useState(false);
  const [lang, setLang] = React.useState("es");
  const [feedback, setFeedback] = React.useState("");
  const [feedbackType, setFeedbackType] = React.useState("suggestion");

  const instagramEnabled = String(process.env.NEXT_PUBLIC_ENABLE_INSTAGRAM_PUBLISH || "").toLowerCase() === "true";
  const [igStatus, setIgStatus] = React.useState<{ connected: boolean; ig_username?: string | null; page_name?: string | null }>({
    connected: false,
  });

  const loadInstagram = React.useCallback(async () => {
    if (!instagramEnabled) return;
    try {
      const res = await fetch("/api/instagram/status");
      const json = await res.json();
      setIgStatus({
        connected: !!json?.connected,
        ig_username: json?.ig_username ?? null,
        page_name: json?.page_name ?? null,
      });
    } catch {
      setIgStatus({ connected: false });
    }
  }, [instagramEnabled]);

  React.useEffect(() => {
    loadInstagram();
  }, [loadInstagram]);

  React.useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "instagram") {
      addToast("Instagram conectado", { type: "success" });
      loadInstagram();
      router.replace("/panel/configuraciones#integraciones");
      return;
    }
    if (error === "instagram") {
      addToast("No se pudo conectar Instagram", { type: "error" });
      router.replace("/panel/configuraciones#integraciones");
    }
  }, [searchParams, addToast, router, loadInstagram]);

  const connectInstagram = () => {
    window.location.href = "/api/instagram/oauth/start";
  };

  const disconnectInstagram = async () => {
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("No se pudo desconectar");
      addToast("Instagram desconectado", { type: "success" });
      await loadInstagram();
    } catch (e: any) {
      addToast(e?.message || "Error al desconectar Instagram", { type: "error" });
    }
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
          <div className="rounded-2xl border border-[var(--field-border)] p-4">
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







