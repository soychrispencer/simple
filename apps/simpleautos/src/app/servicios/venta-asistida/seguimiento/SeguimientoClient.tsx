"use client";

import React from "react";
import { Button, Input, PanelPageLayout, Select, useToast } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";

type StatusRow = {
  id: string;
  reference_code: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  in_progress: "En gestión",
  sold: "Vendido",
  discarded: "Descartado",
};

export default function VentaAsistidaSeguimientoClient({
  initialCode,
  initialToken,
}: {
  initialCode?: string;
  initialToken?: string;
}) {
  const { addToast } = useToast();
  const { user, loading } = useAuth() as any;

  const [code, setCode] = React.useState<string>(() => String(initialCode || ""));
  const [token, setToken] = React.useState<string>(() => String(initialToken || ""));
  const [email, setEmail] = React.useState<string>("");

  const [mode, setMode] = React.useState<"list" | "single" | null>(null);
  const [rows, setRows] = React.useState<StatusRow[]>([]);
  const [selected, setSelected] = React.useState<StatusRow | null>(null);
  const [loadingData, setLoadingData] = React.useState(false);

  const isLoggedIn = Boolean(!loading && user?.id);

  const loadMine = React.useCallback(async () => {
    if (!isLoggedIn) return;
    setLoadingData(true);
    try {
      const res = await fetch("/api/services/venta-asistida/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast((data as any)?.error || "No se pudo cargar.", { type: "error" });
        return;
      }
      const list = ((data as any)?.data || []) as any[];
      const normalized: StatusRow[] = list.map((r) => ({
        id: String(r.id),
        reference_code: String(r.reference_code || r.referenceCode || ""),
        status: String(r.status || ""),
        created_at: String(r.created_at || r.createdAt || ""),
        updated_at: r.updated_at ?? null,
      }));
      setMode("list");
      setRows(normalized);
      setSelected(normalized[0] ?? null);
    } finally {
      setLoadingData(false);
    }
  }, [addToast, isLoggedIn]);

  const lookup = async () => {
    const hasToken = Boolean(token.trim());
    const hasCode = Boolean(code.trim());
    if (!hasToken && !hasCode) {
      addToast("Ingresa tu token o tu código.", { type: "error" });
      return;
    }
    if (!isLoggedIn && !hasToken && !email.trim()) {
      addToast("Ingresa tu email para verificar.", { type: "error" });
      return;
    }

    setLoadingData(true);
    try {
      const q = new URLSearchParams();
      if (hasToken) {
        q.set("token", token.trim());
      } else {
        q.set("code", code.trim());
        if (!isLoggedIn) q.set("email", email.trim());
      }

      const res = await fetch(`/api/services/venta-asistida/status?${q.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast((data as any)?.error || "No se pudo consultar.", { type: "error" });
        return;
      }

      const r = (data as any)?.data;
      const one: StatusRow = {
        id: String(r.id),
        reference_code: String(r.reference_code || r.referenceCode || code.trim()),
        status: String(r.status || ""),
        created_at: String(r.created_at || ""),
        updated_at: r.updated_at ?? null,
      };

      setMode("single");
      setSelected(one);
    } finally {
      setLoadingData(false);
    }
  };

  React.useEffect(() => {
    if (isLoggedIn) {
      void loadMine();
    }
  }, [isLoggedIn, loadMine]);

  const statusLabel = selected?.status ? STATUS_LABELS[selected.status] || selected.status : "-";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 md:px-8 py-10">
      <PanelPageLayout
        header={{
          title: "Seguimiento · Venta asistida",
          description: isLoggedIn
            ? "Revisa el estado de tus solicitudes."
            : "Ingresa tu token (recomendado) o tu código (y email) para ver el estado.",
        }}
      >
        <div className="card-surface shadow-card p-6 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Token (recomendado)"
              value={token}
              onChange={(e) => setToken(String(e.target.value))}
              placeholder="sat_..."
            />
            <Input label="Código" value={code} onChange={(e) => setCode(String(e.target.value))} placeholder="SA-XXXXXXXXXX" />
            <Input
              label={isLoggedIn ? "Email (opcional)" : "Email"}
              value={email}
              onChange={(e) => setEmail(String(e.target.value))}
              placeholder="tu@email.com"
              disabled={isLoggedIn || Boolean(token.trim())}
            />
            <div className="flex items-end">
              <Button variant="primary" size="md" onClick={() => void lookup()} disabled={loadingData}>
                {loadingData ? "Consultando..." : "Consultar"}
              </Button>
            </div>
          </div>

          {mode === "list" && rows.length > 0 ? (
            <div className="mt-5">
              <Select
                label="Mis solicitudes"
                value={selected?.id || ""}
                onChange={(v) => {
                  const next = rows.find((r) => r.id === String(v)) || null;
                  setSelected(next);
                }}
                options={rows.map((r) => ({
                  value: r.id,
                  label: `${r.reference_code} · ${STATUS_LABELS[r.status] || r.status}`,
                }))}
              />
            </div>
          ) : null}

          {selected ? (
            <div className="mt-6 rounded-xl border border-border/60 bg-lightbg/60 dark:bg-darkbg/40 p-4">
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Código</div>
              <div className="text-base font-semibold text-lighttext dark:text-darktext">{selected.reference_code}</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-lighttext/70 dark:text-darktext/70">Estado</div>
                  <div className="font-semibold text-lighttext dark:text-darktext">{statusLabel}</div>
                </div>
                <div>
                  <div className="text-lighttext/70 dark:text-darktext/70">Creada</div>
                  <div className="text-lighttext dark:text-darktext">{new Date(selected.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-lighttext/70 dark:text-darktext/70">Última actualización</div>
                  <div className="text-lighttext dark:text-darktext">{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "-"}</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-lighttext/70 dark:text-darktext/70">
                Si cambiaste el estado, también te llegará una notificación en tu cuenta (campana).
              </div>
            </div>
          ) : null}
        </div>
      </PanelPageLayout>
    </div>
  );
}
