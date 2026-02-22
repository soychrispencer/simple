"use client";

import React from "react";
import { Button, Input, PanelPageLayout, Select, Textarea, useToast } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";

type ManualPaymentRow = {
  id: string;
  created_at: string;
  request_type: string;
  plan_key: string | null;
  listing_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  requester_name: string | null;
  requester_email: string | null;
  proof_note: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  verticals?: {
    key?: string | null;
    name?: string | null;
  } | null;
};

type ManualPaymentEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  actor_role: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "proof_uploaded", label: "Comprobante cargado" },
  { value: "approved", label: "Aprobada" },
  { value: "rejected", label: "Rechazada" },
  { value: "cancelled", label: "Cancelada" }
];

const VERTICAL_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "vehicles", label: "SimpleAutos" },
  { value: "properties", label: "SimplePropiedades" }
];

function isAdminUser(user: any) {
  const role = String(user?.user_role || "").trim().toLowerCase();
  return Boolean(user?.is_admin) || role === "admin" || role === "staff" || role === "superadmin";
}

function formatRequestType(type: string) {
  if (type === "subscription_upgrade") return "Upgrade suscripción";
  if (type === "featured_listing") return "Destacar publicación";
  if (type === "urgent_listing") return "Urgente";
  return "Otro";
}

export default function AdminManualPaymentsPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const canView = isAdminUser(user);

  const [status, setStatus] = React.useState("");
  const [vertical, setVertical] = React.useState("");
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ManualPaymentRow[]>([]);

  const [selected, setSelected] = React.useState<ManualPaymentRow | null>(null);
  const [events, setEvents] = React.useState<ManualPaymentEvent[]>([]);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [editStatus, setEditStatus] = React.useState("pending");
  const [editNote, setEditNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (vertical) params.set("vertical", vertical);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "80");

      const res = await fetch(`/api/admin/payments/manual-requests?${params.toString()}`, {
        cache: "no-store"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json?.error || "No se pudo cargar solicitudes", { type: "error" });
        return;
      }
      setRows((json?.data || []) as ManualPaymentRow[]);
    } finally {
      setLoading(false);
    }
  }, [addToast, canView, q, status, vertical]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openRow = async (row: ManualPaymentRow) => {
    setSelected(row);
    setEvents([]);
    setEditStatus(row.status || "pending");
    setEditNote(String(row.admin_note || ""));
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/manual-requests/${row.id}`, {
        cache: "no-store"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json?.error || "No se pudo cargar detalle", { type: "error" });
        return;
      }
      const nextRequest = (json?.data?.request || row) as ManualPaymentRow;
      const nextEvents = (json?.data?.events || []) as ManualPaymentEvent[];
      setSelected(nextRequest);
      setEditStatus(nextRequest.status || "pending");
      setEditNote(String(nextRequest.admin_note || ""));
      setEvents(nextEvents);
    } finally {
      setDetailsLoading(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payments/manual-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          adminNote: editNote
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(json?.error || "No se pudo actualizar", { type: "error" });
        return;
      }

      addToast(
        editStatus === "approved"
          ? "Solicitud aprobada y suscripción activada"
          : "Solicitud actualizada",
        { type: "success" }
      );
      await load();
      if (selected?.id) {
        await openRow(selected);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <PanelPageLayout
        header={{ title: "Pagos manuales (Admin)", description: "Solicitudes de pago y activación." }}
      >
        <div className="mt-6 card-surface shadow-card p-6 rounded-2xl text-sm text-lighttext/80 dark:text-darktext/80">
          Sin permisos.
        </div>
      </PanelPageLayout>
    );
  }

  return (
    <PanelPageLayout
      header={{
        title: "Pagos manuales (Admin)",
        description: "Gestiona solicitudes de upgrade y activa suscripciones manualmente."
      }}
    >
      <div className="mt-6 card-surface shadow-card p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select
            label="Estado"
            value={status}
            onChange={(v) => setStatus(String(v || ""))}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Vertical"
            value={vertical}
            onChange={(v) => setVertical(String(v || ""))}
            options={VERTICAL_OPTIONS}
          />
          <Input
            label="Buscar"
            value={q}
            onChange={(e) => setQ(String(e.target.value))}
            placeholder="Nombre, email o plan"
          />
          <div className="flex items-end">
            <Button variant="outline" size="md" onClick={() => void load()} disabled={loading}>
              {loading ? "Cargando..." : "Actualizar"}
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-lighttext/70 dark:text-darktext/70">
              <tr>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Vertical</th>
                <th className="py-2 pr-3">Solicitante</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Monto</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Acción</th>
              </tr>
            </thead>
            <tbody className="text-lighttext dark:text-darktext">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-lighttext/70 dark:text-darktext/70">
                    {loading ? "Cargando..." : "Sin resultados"}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-3 pr-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{row.verticals?.name || row.verticals?.key || "—"}</td>
                  <td className="py-3 pr-3">
                    <div className="font-medium">{row.requester_name || "—"}</div>
                    <div className="text-xs text-lighttext/70 dark:text-darktext/70">{row.requester_email || "—"}</div>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">{formatRequestType(row.request_type)}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{row.plan_key || "—"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {Number(row.amount || 0).toLocaleString("es-CL")} {row.currency || "CLP"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">{row.status}</td>
                  <td className="py-3 pr-3">
                    <Button variant="outline" size="sm" onClick={() => void openRow(row)}>
                      Ver / editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="mt-6 card-surface shadow-card p-6 rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-lighttext dark:text-darktext">
                {selected.requester_name || selected.requester_email || "Solicitud"}
              </div>
              <div className="mt-1 text-sm text-lighttext/70 dark:text-darktext/70">
                {formatRequestType(selected.request_type)} · {selected.plan_key || "N/A"} ·{" "}
                {Number(selected.amount || 0).toLocaleString("es-CL")} {selected.currency || "CLP"}
              </div>
              {selected.listing_id ? (
                <div className="mt-1 text-xs text-lighttext/60 dark:text-darktext/60">
                  Listing: {selected.listing_id}
                </div>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Estado"
              value={editStatus}
              onChange={(v) => setEditStatus(String(v || ""))}
              options={STATUS_OPTIONS.filter((option) => option.value)}
            />
            <Input
              label="Revisada"
              value={selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : "Pendiente"}
              onChange={() => {}}
              disabled
            />
          </div>

          {selected.proof_note ? (
            <div className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
              <div className="font-medium mb-1">Nota del solicitante</div>
              <div className="card-surface rounded-lg p-3 border border-border/60">{selected.proof_note}</div>
            </div>
          ) : null}

          <div className="mt-3">
            <Textarea
              label="Nota admin"
              value={editNote}
              onChange={(e) => setEditNote(String(e.target.value))}
              placeholder="Comentarios internos o detalle de la resolución..."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="primary" size="md" onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-lighttext dark:text-darktext mb-2">Historial</div>
            {detailsLoading ? (
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Cargando historial...</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Sin eventos registrados.</div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="rounded-lg border border-border/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-lighttext dark:text-darktext">{event.message || event.event_type}</div>
                      <div className="text-xs text-lighttext/60 dark:text-darktext/60">
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-lighttext/70 dark:text-darktext/70">
                      {event.from_status || "—"} → {event.to_status || "—"} · {event.actor_role || "system"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PanelPageLayout>
  );
}
