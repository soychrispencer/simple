"use client";

import React from "react";
import { Button, Input, PanelPageLayout, Select, Textarea, useToast } from "@simple/ui";
import { useAuth } from "@/context/AuthContext";

type LeadRow = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  reference_code: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_city: string | null;
  listing_id: string | null;
  desired_price: number | null;
  admin_notes: string | null;
  contacted_at: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "En gestión" },
  { value: "sold", label: "Vendido" },
  { value: "discarded", label: "Descartado" },
];

function isAdminUser(user: any) {
  const role = String(user?.user_role || "").trim().toLowerCase();
  return Boolean(user?.is_admin) || role === "admin" || role === "staff" || role === "superadmin";
}

export default function AdminVentaAsistidaPage() {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [status, setStatus] = React.useState<string>("");
  const [q, setQ] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<LeadRow[]>([]);

  const [selected, setSelected] = React.useState<LeadRow | null>(null);
  const [editStatus, setEditStatus] = React.useState<string>("");
  const [editNotes, setEditNotes] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const canView = isAdminUser(user);

  const load = React.useCallback(async () => {
    if (!canView) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/admin/venta-asistida/requests?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data?.error || "No se pudo cargar.", { type: "error" });
        return;
      }
      setRows((data?.data || []) as LeadRow[]);
    } finally {
      setLoading(false);
    }
  }, [addToast, canView, q, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openRow = (row: LeadRow) => {
    setSelected(row);
    setEditStatus(row.status || "new");
    setEditNotes(String(row.admin_notes || ""));
  };

  const save = async () => {
    if (!selected) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/venta-asistida/requests/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          adminNotes: editNotes,
          contactedAt: editStatus === "contacted" ? new Date().toISOString() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data?.error || "No se pudo guardar.", { type: "error" });
        return;
      }

      addToast("Actualizado.", { type: "success" });
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <PanelPageLayout
        header={{
          title: "Venta asistida (Admin)",
          description: "Solicitudes del servicio.",
        }}
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
        title: "Venta asistida (Leads)",
        description: "Revisa solicitudes, cambia estado y deja notas.",
      }}
    >
      <div className="mt-6 mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => (window.location.href = "/panel/admin/pagos-manuales")}>
          Ir a pagos manuales
        </Button>
      </div>

      <div className="mt-6 card-surface shadow-card p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <Select
              label="Estado"
              value={status}
              onChange={(v) => setStatus(String(v || ""))}
              options={STATUS_OPTIONS}
            />
            <Input
              label="Buscar"
              value={q}
              onChange={(e) => setQ(String(e.target.value))}
              placeholder="Nombre, teléfono, email o código..."
            />
            <div className="flex items-end">
              <Button variant="outline" size="md" onClick={() => void load()} disabled={loading}>
                {loading ? "Cargando..." : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-lighttext/70 dark:text-darktext/70">
              <tr>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Teléfono</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Acción</th>
              </tr>
            </thead>
            <tbody className="text-lighttext dark:text-darktext">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-lighttext/70 dark:text-darktext/70">
                    {loading ? "Cargando..." : "Sin resultados"}
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-3 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{r.reference_code || "-"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{r.owner_name || "-"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{r.owner_phone || "-"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">{r.status}</td>
                  <td className="py-3 pr-3">
                    <Button variant="outline" size="sm" onClick={() => openRow(r)}>
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
                {selected.reference_code || "(sin código)"} · {selected.owner_name || "(sin nombre)"}
              </div>
              <div className="mt-1 text-sm text-lighttext/70 dark:text-darktext/70">
                {selected.owner_phone || "-"} · {selected.owner_email || "-"} · {selected.owner_city || "-"}
              </div>
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
              options={STATUS_OPTIONS.filter((o) => o.value !== "")}
            />
            <Input
              label="Listing ID (si aplica)"
              value={selected.listing_id || ""}
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="mt-3">
            <Textarea
              label="Notas internas"
              value={editNotes}
              onChange={(e) => setEditNotes(String(e.target.value))}
              placeholder="Resumen, próximos pasos, observaciones..."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="primary" size="md" onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}
    </PanelPageLayout>
  );
}
