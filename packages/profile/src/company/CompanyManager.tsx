"use client";

import React from "react";
import {
  useSupabase,
  useToast,
  Button,
  FormInput as Input,
  FormSelect as Select,
  Modal,
} from "@simple/ui";
import {
  IconBuilding,
  IconPhone,
  IconMail,
  IconMapPin,
  IconId,
  IconPlus,
  IconChevronDown,
  IconCheck,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { sortRegionsNorthToSouth } from "../utils/sortRegionsNorthToSouth";

// Company form mirrors the new backend schema (companies + company_users.permissions for flags)
type CompanyForm = {
  legalName: string;
  rut: string;
  companyType: string;
  industry: string;
  businessActivity: string;
  address: string;
  regionId: string;
  communeId: string;
  billingEmail: string;
  billingPhone: string;
  whatsapp: string;
  website: string;
  contactName: string;
  isPrimary: boolean;
};

const emptyForm: CompanyForm = {
  legalName: "",
  rut: "",
  companyType: "",
  industry: "",
  businessActivity: "",
  address: "",
  regionId: "",
  communeId: "",
  billingEmail: "",
  billingPhone: "",
  whatsapp: "",
  website: "",
  contactName: "",
  isPrimary: false,
};

const companyTypeOptions = [
  { label: "EIRL", value: "EIRL" },
  { label: "SpA", value: "SpA" },
  { label: "Ltda.", value: "Ltda." },
  { label: "SA", value: "SA" },
  { label: "Otra", value: "Otra" },
];

const businessTypeOptions = [
  { label: "Vendedor independiente", value: "independiente" },
  { label: "Concesionaria", value: "concesionaria" },
  { label: "Rent a Car", value: "rentacar" },
  { label: "Otra", value: "otra" },
];

export type CompanyRecord = {
  id: string;
  legal_name: string | null;
  rut: string | null;
  company_type: string | null;
  industry: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  address_legal: string | null;
  region_id: string | null;
  commune_id: string | null;
  billing_data?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
  region?: { name: string | null } | null;
  commune?: { name: string | null } | null;
};

type CompanyMembership = {
  membershipId: string;
  role: string | null;
  permissions: Record<string, any>;
  status?: string | null;
  company: CompanyRecord;
};

const mapToForm = (c: CompanyMembership): CompanyForm => {
  const billingData = c.company.billing_data || {};
  return {
    legalName: c.company.legal_name || "",
    rut: c.company.rut || "",
    companyType: c.company.company_type || "",
    industry: c.company.industry || "",
    businessActivity: billingData.business_activity || "",
    address: c.company.address_legal || "",
    regionId: c.company.region_id ? String(c.company.region_id) : "",
    communeId: c.company.commune_id ? String(c.company.commune_id) : "",
    billingEmail: c.company.billing_email || "",
    billingPhone: c.company.billing_phone || "",
    whatsapp: billingData.whatsapp || "",
    website: billingData.website || "",
    contactName: billingData.contact_name || c.permissions?.contact_name || "",
    isPrimary: Boolean(c.permissions?.primary),
  };
};

const CompanyManager: React.FC<{ userId?: string; autoOpenCreate?: boolean }> = ({ userId, autoOpenCreate }) => {
  const supabase = useSupabase();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showForm, setShowForm] = React.useState(Boolean(autoOpenCreate));
  const [companies, setCompanies] = React.useState<CompanyMembership[]>([]);
  const [regions, setRegions] = React.useState<Array<{ label: string; value: string }>>([]);
  const [communesCreate, setCommunesCreate] = React.useState<Array<{ label: string; value: string }>>([]);
  const [communesEdit, setCommunesEdit] = React.useState<Array<{ label: string; value: string }>>([]);
  const [form, setForm] = React.useState<CompanyForm>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingMembershipId, setEditingMembershipId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<CompanyForm | null>(null);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = React.useState<{ companyId: string; membershipId: string; companyName?: string; isOwner: boolean } | null>(null);

  const fetchRegions = React.useCallback(async () => {
    const { data, error } = await supabase.from("regions").select("id,name,code").order("name");
    if (error) {
      console.error("[CompanyManager] regiones", error);
      addToast("No pudimos cargar regiones", { type: "error" });
      return;
    }
    const sorted = sortRegionsNorthToSouth((data || []) as any);
    const opts = sorted.map((r: any) => ({ label: r.name, value: String(r.id) }));
    setRegions(opts);
  }, [supabase, addToast]);

  const loadCommunes = React.useCallback(
    async (regionId: string, mode: "create" | "edit") => {
      if (!regionId) {
        mode === "create" ? setCommunesCreate([]) : setCommunesEdit([]);
        return;
      }
      const { data, error } = await supabase
        .from("communes")
        .select("id,name")
        .eq("region_id", regionId)
        .order("name");
      if (error) {
        console.error(`[CompanyManager] comunas ${mode}`, error);
        addToast("No pudimos cargar comunas", { type: "error" });
        mode === "create" ? setCommunesCreate([]) : setCommunesEdit([]);
        return;
      }
      const opts = (data || []).map((c: any) => ({ label: c.name, value: String(c.id) }));
      mode === "create" ? setCommunesCreate(opts) : setCommunesEdit(opts);
    },
    [supabase, addToast]
  );

  const fetchCompanies = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("company_users")
      .select(
        `id, role, permissions, status,
         company:companies(
           id, legal_name, rut, company_type, industry, billing_email, billing_phone, address_legal,
           region_id, commune_id, billing_data, created_at, updated_at,
           region:region_id(name),
           commune:commune_id(name)
         )`
      )
      .eq("user_id", userId)
      .order("created_at", { foreignTable: "companies", ascending: false });

    if (error) {
      console.error("[CompanyManager] fetch", error);
      addToast("No pudimos cargar tus negocios", { type: "error" });
      setLoading(false);
      return;
    }

    const mapped: CompanyMembership[] = (data || [])
      .filter((row: any) => !!row?.company)
      .map((row: any) => ({
        membershipId: row.id,
        role: row.role,
        permissions: row.permissions || {},
        status: row.status,
        company: row.company,
      }));
    setCompanies(mapped);
    setLoading(false);
  }, [supabase, userId, addToast]);

  React.useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  React.useEffect(() => {
    if (autoOpenCreate) {
      setShowForm(true);
    }
  }, [autoOpenCreate]);

  React.useEffect(() => {
    if (form.regionId) {
      loadCommunes(form.regionId, "create");
    }
  }, [form.regionId, loadCommunes]);

  React.useEffect(() => {
    if (editForm?.regionId) {
      loadCommunes(editForm.regionId, "edit");
    }
  }, [editForm?.regionId, loadCommunes]);

  const validateRut = (rut: string) => /^[0-9]{7,9}-[0-9kK]$/.test(rut.trim());
  const validateEmail = (email: string) => /.+@.+\..+/.test(email.trim());
  const validatePhone = (phone: string) => /^[0-9+][0-9\s-]{7,14}$/.test(phone.trim());

  const validate = (data: CompanyForm) => {
    const errors: Record<string, string> = {};
    const required: Array<keyof CompanyForm> = ["legalName", "rut", "regionId", "communeId", "billingEmail"];
    required.forEach((k) => {
      const v = data[k];
      if (!v || !String(v).trim()) errors[k] = "Requerido";
    });

    if (data.rut && !validateRut(data.rut)) errors.rut = "Formato RUT inválido (12345678-9)";
    if (data.billingEmail && !validateEmail(data.billingEmail)) errors.billingEmail = "Correo inválido";
    if (data.billingPhone && !validatePhone(data.billingPhone)) errors.billingPhone = "Teléfono inválido";
    if (data.whatsapp && !validatePhone(data.whatsapp)) errors.whatsapp = "WhatsApp inválido";
    return errors;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setCommunesCreate([]);
  };

  const resetEdit = () => {
    setEditingId(null);
    setEditingMembershipId(null);
    setEditForm(null);
    setEditErrors({});
    setCommunesEdit([]);
  };

  const clearPrimary = async (exceptMembershipId?: string | null) => {
    const primaryMemberships = companies.filter((c) => c.permissions?.primary && c.membershipId !== exceptMembershipId);
    if (!primaryMemberships.length) return;
    await Promise.all(
      primaryMemberships.map(async (m) => {
        const nextPerms = { ...(m.permissions || {}) };
        delete nextPerms.primary;
        const { error } = await supabase.from("company_users").update({ permissions: nextPerms }).eq("id", m.membershipId);
        if (error) throw new Error(error.message || error.hint || error.details || "No se pudo limpiar negocio principal");
      })
    );
  };

  const extractErrorMessage = (err: unknown) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    const asAny = err as any;
    return asAny.message || asAny.hint || asAny.details || asAny.error_description || "";
  };

  const buildPayload = (data: CompanyForm) => {
    // billing_data almacena campos adicionales permitidos por el schema
    const billing_data = {
      website: data.website?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      contact_name: data.contactName?.trim() || null,
      business_activity: data.businessActivity?.trim() || null,
    } satisfies Record<string, any>;

    return {
      legal_name: data.legalName.trim(),
      rut: data.rut.trim(),
      company_type: data.companyType || null,
      industry: data.industry || null,
      billing_email: data.billingEmail?.trim() || null,
      billing_phone: data.billingPhone?.trim() || null,
      address_legal: data.address?.trim() || null,
      region_id: data.regionId || null,
      commune_id: data.communeId || null,
      billing_data,
      // plan_key no se envía desde el cliente; queda con default 'free'
    } as const;
  };

  const handleCreate = async () => {
    if (!userId) return;
    const errors = validate(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      addToast("Completa los campos obligatorios del negocio.", { type: "error" });
      return;
    }
    setSaving(true);
    let lastStep: 'clear_primary' | 'rpc_create_company' | null = null;
    let debugPayload: Record<string, any> | null = null;
    let debugRpcResponse: any = null;
    try {
      const payload = buildPayload(form);
      debugPayload = payload;
      if (form.isPrimary) {
        lastStep = 'clear_primary';
        await clearPrimary(null);
      }
      const permissions: Record<string, any> = {};
      if (form.isPrimary) permissions.primary = true;
      if (form.contactName?.trim()) permissions.contact_name = form.contactName.trim();
      lastStep = 'rpc_create_company';
      const { data: created, error: rpcError } = await supabase
        .rpc('create_company_with_owner', { input: payload, perms: permissions });
      debugRpcResponse = { created, rpcError };
      if (rpcError || !created) {
        const rpcErrAny = rpcError as any;
        const baseMessage = rpcErrAny?.message || rpcErrAny?.hint || rpcErrAny?.details;
        throw new Error(baseMessage || "No se insertó el negocio (respuesta vacía)");
      }
      addToast("Negocio guardado", { type: "success" });
      resetForm();
      setShowForm(false);
      await fetchCompanies();
    } catch (error: any) {
      const rawMessage = extractErrorMessage(error);
      const message = rawMessage && String(rawMessage).trim()
        ? rawMessage
        : "No se pudo guardar el negocio";
      console.error("[CompanyManager] create", {
        step: lastStep,
        error,
        payload: debugPayload,
        rpc: debugRpcResponse,
        message,
      });
      addToast(`${message}${lastStep ? ` (${lastStep})` : ''}`, { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!userId || !editingId || !editForm) return;
    const errors = validate(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      addToast("Completa los campos obligatorios del negocio.", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(editForm);
      if (editForm.isPrimary) {
        await clearPrimary(editingMembershipId);
      }
      const { error: updateError } = await supabase.from("companies").update(payload).eq("id", editingId);
      if (updateError) throw updateError;

      if (editingMembershipId) {
        const currentPerms = companies.find((c) => c.membershipId === editingMembershipId)?.permissions || {};
        const perms: Record<string, any> = { ...currentPerms };
        if (editForm.isPrimary) perms.primary = true; else delete perms.primary;
        if (editForm.contactName?.trim()) perms.contact_name = editForm.contactName.trim(); else delete perms.contact_name;
        const { error: permError } = await supabase
          .from("company_users")
          .update({ permissions: perms })
          .eq("id", editingMembershipId);
        if (permError) throw permError;
      }

      addToast("Negocio actualizado", { type: "success" });
      resetEdit();
      await fetchCompanies();
    } catch (error: any) {
      console.error("[CompanyManager] update", error);
      addToast(error?.message || "No se pudo actualizar el negocio", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (companyId: string, membershipId: string, isOwner: boolean) => {
    if (!companyId || !membershipId) return;
    setSaving(true);
    try {
      if (isOwner) {
        await supabase.from("companies").delete().eq("id", companyId);
        await supabase.from("company_users").delete().eq("id", membershipId);
      } else {
        await supabase.from("company_users").delete().eq("id", membershipId);
      }
      addToast(isOwner ? "Negocio eliminado" : "Membresía eliminada", { type: "success" });
      await fetchCompanies();
    } catch (error: any) {
      console.error("[CompanyManager] delete", error);
      addToast("No se pudo eliminar", { type: "error" });
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const renderCompanyCard = (item: CompanyMembership) => {
    const billingData = item.company.billing_data || {};
    const isPrimary = Boolean(item.permissions?.primary);
    const isOwner = item.role === "owner";
    return (
      <div key={item.company.id} className="card-surface shadow-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBuilding size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-lighttext dark:text-darktext">{item.company.legal_name || "Sin nombre"}</p>
              <p className="text-xs text-lighttext/70 dark:text-darktext/70">RUT: {item.company.rut || "-"}</p>
            </div>
          </div>
          {isPrimary ? (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
              <IconCheck size={14} /> Principal
            </span>
          ) : null}
        </div>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70">{item.company.address_legal || "Sin dirección"}</p>
        <div className="text-xs text-lighttext/60 dark:text-darktext/60 flex flex-wrap gap-3">
          <span>Tipo: {item.company.company_type || "-"}</span>
          <span>Industria: {item.company.industry || "-"}</span>
          <span>Tel: {item.company.billing_phone || "-"}</span>
          <span>Correo: {item.company.billing_email || "-"}</span>
          {billingData?.website ? <span>Web: {billingData.website}</span> : null}
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="neutral"
            size="sm"
            leftIcon={<IconPencil size={14} />}
            disabled={saving || !isOwner}
            onClick={() => {
              if (!isOwner) return;
              setEditingId(item.company.id);
              setEditingMembershipId(item.membershipId);
              const draft = mapToForm(item);
              setEditForm(draft);
              if (draft.regionId) {
                loadCommunes(draft.regionId, "edit");
              }
            }}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconTrash size={14} />}
            disabled={saving || (!isOwner && companies.length === 1)}
            onClick={() => {
              if (isOwner) {
                setDeleteTarget({
                  companyId: item.company.id,
                  membershipId: item.membershipId,
                  companyName: item.company.legal_name || item.company.rut || undefined,
                  isOwner,
                });
              } else {
                handleDelete(item.company.id, item.membershipId, false);
              }
            }}
          >
            {isOwner ? "Eliminar" : "Salir"}
          </Button>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!deleteTarget?.isOwner) return null;
    const name = deleteTarget.companyName || "este negocio";
    return (
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar negocio"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteTarget.companyId, deleteTarget.membershipId, true)} disabled={saving}>
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        )}
      >
        <div className="space-y-2 text-sm text-lighttext dark:text-darktext">
          <p>
            Vas a eliminar <strong>{name}</strong> para todos los miembros. Esta acción no se puede deshacer.
          </p>
          <p>Si sólo quieres salir, pide a otro administrador que quite tu acceso en lugar de eliminar el negocio completo.</p>
        </div>
      </Modal>
    );
  };

  const renderCreateForm = () => (
    <div className="card-surface shadow-card p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Razón social"
          value={form.legalName}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, legalName: e.target.value }));
            setFormErrors((prev) => ({ ...prev, legalName: "" }));
          }}
          error={formErrors.legalName}
          required
        />
        <Input
          label="RUT del negocio"
          value={form.rut}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, rut: e.target.value }));
            setFormErrors((prev) => ({ ...prev, rut: "" }));
          }}
          leftIcon={<IconId size={16} />}
          error={formErrors.rut}
          required
        />
        <Select
          label="Tipo legal"
          value={form.companyType}
          onChange={(v) => setForm((prev) => ({ ...prev, companyType: String(v) }))}
          options={companyTypeOptions}
          placeholder="Selecciona"
        />
        <Select
          label="Tipo de negocio"
          value={form.businessActivity}
          onChange={(v) => setForm((prev) => ({ ...prev, businessActivity: String(v) }))}
          options={businessTypeOptions}
          placeholder="Selecciona"
        />
        <Input
          label="Industria / giro"
          value={form.industry}
          onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
        />
        <Input
          label="Sitio web"
          value={form.website}
          onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
        />
        <Input
          label="Dirección legal"
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          leftIcon={<IconMapPin size={16} />}
        />
        <Select
          label="Región"
          value={form.regionId}
          onChange={(v) => {
            setForm((prev) => ({ ...prev, regionId: String(v), communeId: "" }));
            setFormErrors((prev) => ({ ...prev, regionId: "", communeId: "" }));
          }}
          options={regions}
          placeholder="Selecciona"
          error={formErrors.regionId}
        />
        <Select
          label="Comuna"
          value={form.communeId}
          onChange={(v) => {
            setForm((prev) => ({ ...prev, communeId: String(v) }));
            setFormErrors((prev) => ({ ...prev, communeId: "" }));
          }}
          options={communesCreate}
          placeholder={form.regionId ? "Selecciona" : "Elige una región"}
          disabled={!form.regionId}
          error={formErrors.communeId}
        />
        <Input
          label="Correo de facturación"
          type="email"
          value={form.billingEmail}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, billingEmail: e.target.value }));
            setFormErrors((prev) => ({ ...prev, billingEmail: "" }));
          }}
          leftIcon={<IconMail size={16} />}
          error={formErrors.billingEmail}
          required
        />
        <Input
          label="Teléfono de facturación"
          type="tel"
          value={form.billingPhone}
          onChange={(e) => setForm((prev) => ({ ...prev, billingPhone: e.target.value }))}
          leftIcon={<IconPhone size={16} />}
        />
        <Input
          label="WhatsApp"
          type="tel"
          value={form.whatsapp}
          onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
          leftIcon={<IconPhone size={16} />}
        />
        <Input
          label="Contacto principal"
          value={form.contactName}
          onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm text-lighttext dark:text-darktext">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
            className="accent-primary"
          />
          <span>Marcar como negocio principal</span>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancelar</Button>
        <Button variant="primary" onClick={handleCreate} disabled={saving}>
          {saving ? "Guardando..." : "Guardar negocio"}
        </Button>
      </div>
    </div>
  );

  const renderEditForm = () => {
    if (!editForm) return null;
    return (
      <div className="card-surface shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Razón social"
            value={editForm.legalName}
            onChange={(e) => {
              setEditForm((prev) => (prev ? { ...prev, legalName: e.target.value } : prev));
              setEditErrors((prev) => ({ ...prev, legalName: "" }));
            }}
            error={editErrors.legalName}
            required
          />
          <Input
            label="RUT del negocio"
            value={editForm.rut}
            onChange={(e) => {
              setEditForm((prev) => (prev ? { ...prev, rut: e.target.value } : prev));
              setEditErrors((prev) => ({ ...prev, rut: "" }));
            }}
            leftIcon={<IconId size={16} />}
            error={editErrors.rut}
            required
          />
          <Select
            label="Tipo legal"
            value={editForm.companyType}
            onChange={(v) => setEditForm((prev) => (prev ? { ...prev, companyType: String(v) } : prev))}
            options={companyTypeOptions}
            placeholder="Selecciona"
          />
          <Select
            label="Tipo de negocio"
            value={editForm.businessActivity}
            onChange={(v) => setEditForm((prev) => (prev ? { ...prev, businessActivity: String(v) } : prev))}
            options={businessTypeOptions}
            placeholder="Selecciona"
          />
          <Input
            label="Industria / giro"
            value={editForm.industry}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, industry: e.target.value } : prev))}
          />
          <Input
            label="Sitio web"
            value={editForm.website}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, website: e.target.value } : prev))}
          />
          <Input
            label="Dirección legal"
            value={editForm.address}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
            leftIcon={<IconMapPin size={16} />}
          />
          <Select
            label="Región"
            value={editForm.regionId}
            onChange={(v) => {
              setEditForm((prev) => (prev ? { ...prev, regionId: String(v), communeId: "" } : prev));
              setEditErrors((prev) => ({ ...prev, regionId: "", communeId: "" }));
            }}
            options={regions}
            placeholder="Selecciona"
            error={editErrors.regionId}
          />
          <Select
            label="Comuna"
            value={editForm.communeId}
            onChange={(v) => {
              setEditForm((prev) => (prev ? { ...prev, communeId: String(v) } : prev));
              setEditErrors((prev) => ({ ...prev, communeId: "" }));
            }}
            options={communesEdit}
            placeholder={editForm.regionId ? "Selecciona" : "Elige una región"}
            disabled={!editForm.regionId}
            error={editErrors.communeId}
          />
          <Input
            label="Correo de facturación"
            type="email"
            value={editForm.billingEmail}
            onChange={(e) => {
              setEditForm((prev) => (prev ? { ...prev, billingEmail: e.target.value } : prev));
              setEditErrors((prev) => ({ ...prev, billingEmail: "" }));
            }}
            leftIcon={<IconMail size={16} />}
            error={editErrors.billingEmail}
            required
          />
          <Input
            label="Teléfono de facturación"
            type="tel"
            value={editForm.billingPhone}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, billingPhone: e.target.value } : prev))}
            leftIcon={<IconPhone size={16} />}
          />
          <Input
            label="WhatsApp"
            type="tel"
            value={editForm.whatsapp}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, whatsapp: e.target.value } : prev))}
            leftIcon={<IconPhone size={16} />}
          />
          <Input
            label="Contacto principal"
            value={editForm.contactName}
            onChange={(e) => setEditForm((prev) => (prev ? { ...prev, contactName: e.target.value } : prev))}
          />
          <label className="flex items-center gap-2 text-sm text-lighttext dark:text-darktext">
            <input
              type="checkbox"
              checked={editForm.isPrimary}
              onChange={(e) => setEditForm((prev) => (prev ? { ...prev, isPrimary: e.target.checked } : prev))}
              className="accent-primary"
            />
            <span>Marcar como empresa principal</span>
            <span>Marcar como negocio principal</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={resetEdit}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdate} disabled={saving}>
            {saving ? "Guardando..." : "Actualizar negocio"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Mi Negocio</h3>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">Gestiona uno o varios negocios vinculados a tu cuenta.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm((s) => !s)}
          leftIcon={<IconPlus size={16} />}
          rightIcon={<IconChevronDown size={14} className={showForm ? "rotate-180" : "rotate-0"} />}
        >
          {showForm ? "Ocultar formulario" : "Agregar negocio"}
        </Button>
      </div>

      {showForm ? renderCreateForm() : null}

      {editForm ? (
        <div>
          <h4 className="text-sm font-semibold text-lighttext dark:text-darktext mb-2">Editando empresa</h4>
          {renderEditForm()}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-lighttext/70 dark:text-darktext/70">Cargando empresas...</p>
      ) : companies.length === 0 ? (
        <div className="text-sm text-lighttext/70 dark:text-darktext/70">Aún no tienes negocios. Agrega el primero para habilitar tu perfil de negocio.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(renderCompanyCard)}
        </div>
      )}

      {renderDeleteModal()}
    </div>
  );
};

export default CompanyManager;
