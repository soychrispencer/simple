import React from "react";
import { IconMapPin, IconHome, IconTrash, IconCheck, IconPlus, IconChevronDown, IconPencil, IconX } from "@tabler/icons-react";
import { useSupabase, useToast, Button, FormInput as Input, FormSelect as Select } from "@simple/ui";
import { sortRegionsNorthToSouth } from "../utils/sortRegionsNorthToSouth";

type AddressForm = {
  type: string;
  label: string;
  line1: string;
  line2: string;
  country: string;
  regionId: string;
  communeId: string;
  postalCode: string;
  isDefault: boolean;
};

const addressTypeOptions = [
  { label: "Casa", value: "home" },
  { label: "Facturación", value: "billing" },
  { label: "Envío", value: "shipping" },
  { label: "Otro", value: "other" },
];

const typeLabels: Record<string, string> = {
  home: "Casa",
  billing: "Facturación",
  shipping: "Envío",
  other: "Otro",
};

const latamCountries = [
  "Argentina","Bolivia","Brasil","Chile","Colombia","Costa Rica","Cuba","República Dominicana","Ecuador","El Salvador","Guatemala","Honduras","México","Nicaragua","Panamá","Paraguay","Perú","Puerto Rico","Uruguay","Venezuela"
].map((c) => ({ label: c, value: c }));

const ProfileAddresses: React.FC<{ userId?: string }> = ({ userId }) => {
  const supabase = useSupabase();
  const { addToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [addresses, setAddresses] = React.useState<any[]>([]);
  const [regions, setRegions] = React.useState<Array<{ label: string; value: string }>>([]);
  const [communesCreate, setCommunesCreate] = React.useState<Array<{ label: string; value: string }>>([]);
  const [communesEdit, setCommunesEdit] = React.useState<Array<{ label: string; value: string }>>([]);
  const [loadingRegions, setLoadingRegions] = React.useState(false);
  const [loadingCommunesCreate, setLoadingCommunesCreate] = React.useState(false);
  const [loadingCommunesEdit, setLoadingCommunesEdit] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const emptyForm: AddressForm = {
    type: "home",
    label: "",
    line1: "",
    line2: "",
    country: "Chile",
    regionId: "",
    communeId: "",
    postalCode: "",
    isDefault: false,
  };
  const [form, setForm] = React.useState<AddressForm>(emptyForm);
  const [formErrors, setFormErrors] = React.useState<{ [k: string]: string }>({});
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<AddressForm | null>(null);
  const [editErrors, setEditErrors] = React.useState<{ [k: string]: string }>({});

  const fetchAddresses = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profile_addresses")
      .select("id,type,label,line1,line2,country,region_id,commune_id,region:region_id(name),commune:commune_id(name),postal_code,is_default,created_at")
      .eq("profile_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ProfileAddresses] fetch", error?.message || error);
      addToast(error?.message || "No pudimos cargar direcciones", { type: "error" });
    } else {
      const mapped = (data || []).map((addr: any) => ({
        ...addr,
        region_name: addr.region?.name,
        commune_name: addr.commune?.name,
      }));
      setAddresses(mapped);
    }
    setLoading(false);
  }, [supabase, userId, addToast]);

  React.useEffect(() => {
    let active = true;
    const loadRegions = async () => {
      setLoadingRegions(true);
      const { data, error } = await supabase.from("regions").select("id,name,code").order("name", { ascending: true });
      if (!active) return;
      if (error) {
        console.error("[ProfileAddresses] regiones", error);
        addToast("No pudimos cargar regiones", { type: "error" });
        setLoadingRegions(false);
        return;
      }
      const sorted = sortRegionsNorthToSouth((data || []) as any);
      const opts = sorted.map((r: any) => ({ label: r.name, value: r.id }));
      setRegions(opts);
      setLoadingRegions(false);
    };
    loadRegions();
    return () => { active = false; };
  }, [supabase, addToast]);

  const loadCommunesCreate = React.useCallback(async (regionId: string) => {
    if (!regionId) { setCommunesCreate([]); return; }
    setLoadingCommunesCreate(true);
    const { data, error } = await supabase
      .from("communes")
      .select("id,name")
      .eq("region_id", regionId)
      .order("name", { ascending: true });
    if (error) {
      console.error("[ProfileAddresses] comunas", error);
      addToast("No pudimos cargar comunas", { type: "error" });
      setCommunesCreate([]);
      setLoadingCommunesCreate(false);
      return;
    }
    const opts = (data || []).map((c: any) => ({ label: c.name, value: c.id }));
    setCommunesCreate(opts);
    setLoadingCommunesCreate(false);
  }, [supabase, addToast]);

  const loadCommunesEdit = React.useCallback(async (regionId: string) => {
    if (!regionId) { setCommunesEdit([]); return; }
    setLoadingCommunesEdit(true);
    const { data, error } = await supabase
      .from("communes")
      .select("id,name")
      .eq("region_id", regionId)
      .order("name", { ascending: true });
    if (error) {
      console.error("[ProfileAddresses] comunas edit", error);
      addToast("No pudimos cargar comunas", { type: "error" });
      setCommunesEdit([]);
      setLoadingCommunesEdit(false);
      return;
    }
    const opts = (data || []).map((c: any) => ({ label: c.name, value: c.id }));
    setCommunesEdit(opts);
    setLoadingCommunesEdit(false);
  }, [supabase, addToast]);

  React.useEffect(() => {
    if (form.regionId) {
      loadCommunesCreate(form.regionId);
    } else {
      setCommunesCreate([]);
    }
  }, [form.regionId, loadCommunesCreate]);

  React.useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const isDuplicateLabel = (label: string, ignoreId?: string | null) => {
    if (!label) return false;
    const norm = label.trim().toLowerCase();
    return addresses.some((addr) => addr.label?.trim().toLowerCase() === norm && addr.id !== ignoreId);
  };

  const validateAddress = (data: AddressForm, ignoreId?: string | null) => {
    const required = ["type", "line1", "country", "regionId", "communeId"];
    const errors: { [k: string]: string } = {};
    required.forEach((k) => {
      const value = (data as any)[k];
      if (!value || !String(value).trim()) {
        errors[k] = "Requerido";
      }
    });
    if (isDuplicateLabel(data.label, ignoreId)) {
      errors.label = "Etiqueta duplicada";
    }
    return errors;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setCommunesCreate([]);
  };

  const handleSave = async () => {
    if (!userId) return;
    const validation = validateAddress(form, null);
    if (Object.keys(validation).length > 0) {
      setFormErrors(validation);
      addToast("Completa los campos obligatorios de la dirección.", { type: "error" });
      return;
    }
    setSaving(true);
    const payload = {
      profile_id: userId,
      type: form.type,
      label: form.label?.trim() || null,
      line1: form.line1.trim(),
      line2: form.line2?.trim() || null,
      country: form.country?.trim() || null,
      region_id: form.regionId,
      commune_id: form.communeId,
      postal_code: form.postalCode?.trim() || null,
      is_default: form.isDefault,
    };
    try {
      if (form.isDefault) {
        await supabase.from("profile_addresses").update({ is_default: false }).eq("profile_id", userId);
      }
      const { error } = await supabase.from("profile_addresses").insert(payload);
      if (error) {
        console.error("[ProfileAddresses] insert", error);
        addToast("No se pudo guardar la dirección", { type: "error" });
      } else {
        addToast("Dirección guardada", { type: "success" });
        resetForm();
        fetchAddresses();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("profile_addresses").delete().eq("id", id);
    if (error) {
      console.error("[ProfileAddresses] delete", error);
      addToast("No se pudo eliminar", { type: "error" });
    } else {
      addToast("Dirección eliminada", { type: "success" });
      fetchAddresses();
    }
  };

  const handleEditStart = async (addr: any) => {
    setEditingId(addr.id);
    const draft: AddressForm = {
      type: addr.type,
      label: addr.label || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      country: addr.country || "Chile",
      regionId: addr.region_id ? String(addr.region_id) : "",
      communeId: addr.commune_id ? String(addr.commune_id) : "",
      postalCode: addr.postal_code || "",
      isDefault: !!addr.is_default,
    };
    setEditForm(draft);
    setEditErrors({});
    if (draft.regionId) {
      await loadCommunesEdit(draft.regionId);
    } else {
      setCommunesEdit([]);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditErrors({});
    setCommunesEdit([]);
  };

  const handleUpdate = async () => {
    if (!userId || !editingId || !editForm) return;
    const validation = validateAddress(editForm, editingId);
    if (Object.keys(validation).length > 0) {
      setEditErrors(validation);
      addToast("Completa los campos obligatorios de la dirección.", { type: "error" });
      return;
    }
    setSaving(true);
    const payload = {
      type: editForm.type,
      label: editForm.label?.trim() || null,
      line1: editForm.line1.trim(),
      line2: editForm.line2?.trim() || null,
      country: editForm.country?.trim() || null,
      region_id: editForm.regionId,
      commune_id: editForm.communeId,
      postal_code: editForm.postalCode?.trim() || null,
      is_default: editForm.isDefault,
    };
    try {
      if (editForm.isDefault) {
        await supabase.from("profile_addresses").update({ is_default: false }).eq("profile_id", userId);
      }
      const { error } = await supabase.from("profile_addresses").update(payload).eq("id", editingId);
      if (error) {
        console.error("[ProfileAddresses] update", error);
        addToast("No se pudo actualizar la dirección", { type: "error" });
      } else {
        addToast("Dirección actualizada", { type: "success" });
        handleCancelEdit();
        fetchAddresses();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Direcciones</h3>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">Gestiona envíos, facturación u otras direcciones.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)} leftIcon={<IconPlus size={16} />} rightIcon={<IconChevronDown size={14} className={showForm ? "rotate-180" : "rotate-0"} />}>
          {showForm ? "Ocultar formulario" : "Agregar dirección"}
        </Button>
      </div>

      {showForm && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 card-surface shadow-card p-4">
        <Select
          label="Tipo"
          value={form.type}
          onChange={(value) => setForm((prev) => ({ ...prev, type: String(value) }))}
          options={addressTypeOptions}
        />
        <Input
          label="Etiqueta"
          placeholder="Ej: Casa, Oficina"
          value={form.label}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, label: e.target.value }));
            setFormErrors((prev) => ({ ...prev, label: "" }));
          }}
          error={formErrors.label || undefined}
        />
        {formErrors.label ? <p className="text-xs text-[var(--color-danger)]">{formErrors.label}</p> : null}
        <Input
          label="Dirección"
          placeholder="Calle y número"
          value={form.line1}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, line1: e.target.value }));
            setFormErrors((prev) => ({ ...prev, line1: "" }));
          }}
          leftIcon={<IconMapPin size={16} />}
          error={formErrors.line1 || undefined}
        />
        {formErrors.line1 ? <p className="text-xs text-[var(--color-danger)]">{formErrors.line1}</p> : null}
        <Input
          label="Depto / Oficina (opcional)"
          placeholder="Apto, piso, referencia"
          value={form.line2}
          onChange={(e) => setForm((prev) => ({ ...prev, line2: e.target.value }))}
        />
        <Select
          label="País"
          value={form.country}
          onChange={(value) => setForm((prev) => ({ ...prev, country: String(value) }))}
          options={latamCountries}
          error={formErrors.country || undefined}
        />
        {formErrors.country ? <p className="text-xs text-[var(--color-danger)]">{formErrors.country}</p> : null}
        <Select
          label="Región"
          value={form.regionId}
          onChange={(value) => {
            setForm((prev) => ({ ...prev, regionId: String(value), communeId: "" }));
            setFormErrors((prev) => ({ ...prev, regionId: "", communeId: "" }));
          }}
          options={regions}
          placeholder={loadingRegions ? "Cargando..." : "Región"}
          disabled={loadingRegions}
          error={formErrors.regionId || undefined}
        />
        {formErrors.regionId ? <p className="text-xs text-[var(--color-danger)]">{formErrors.regionId}</p> : null}
        <Select
          label="Comuna"
          value={form.communeId}
          onChange={(value) => {
            setForm((prev) => ({ ...prev, communeId: String(value) }));
            setFormErrors((prev) => ({ ...prev, communeId: "" }));
          }}
          options={communesCreate}
          placeholder={!form.regionId ? "Selecciona una región" : loadingCommunesCreate ? "Cargando..." : "Comuna"}
          disabled={!form.regionId || loadingCommunesCreate}
          error={formErrors.communeId || undefined}
        />
        {formErrors.communeId ? <p className="text-xs text-[var(--color-danger)]">{formErrors.communeId}</p> : null}
        <Input
          label="Código postal (opcional)"
          value={form.postalCode}
          onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm text-lighttext dark:text-darktext">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            className="accent-primary"
          />
          <span>Marcar como principal</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="subtle" onClick={resetForm}>Limpiar</Button>
        <Button onClick={handleSave} loading={saving} leftIcon={<IconCheck size={16} />}>Guardar dirección</Button>
      </div>
      </>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1,2].map((i) => (
              <div key={i} className="card-surface shadow-card p-4 animate-pulse">
                <div className="h-4 w-1/4 bg-[var(--overlay-scrim-10)] dark:bg-[var(--overlay-highlight-10)] rounded" />
                <div className="mt-3 h-3 w-3/4 bg-[var(--overlay-scrim-10)] dark:bg-[var(--overlay-highlight-10)] rounded" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">Aún no tienes direcciones guardadas.</p>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className="card-surface shadow-card p-4 space-y-3">
              {editingId === addr.id && editForm ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Tipo"
                    value={editForm.type}
                    onChange={(value) => setEditForm((prev) => prev ? ({ ...prev, type: String(value) }) : prev)}
                    options={addressTypeOptions}
                  />
                  <Input
                    label="Etiqueta"
                    value={editForm.label}
                    onChange={(e) => {
                      setEditForm((prev) => prev ? ({ ...prev, label: e.target.value }) : prev);
                      setEditErrors((prev) => ({ ...prev, label: "" }));
                    }}
                    error={editErrors.label || undefined}
                  />
                  {editErrors.label ? <p className="text-xs text-[var(--color-danger)]">{editErrors.label}</p> : null}
                  <Input
                    label="Dirección"
                    value={editForm.line1}
                    onChange={(e) => {
                      setEditForm((prev) => prev ? ({ ...prev, line1: e.target.value }) : prev);
                      setEditErrors((prev) => ({ ...prev, line1: "" }));
                    }}
                    leftIcon={<IconMapPin size={16} />}
                    error={editErrors.line1 || undefined}
                  />
                  {editErrors.line1 ? <p className="text-xs text-[var(--color-danger)]">{editErrors.line1}</p> : null}
                  <Input
                    label="Depto / Oficina (opcional)"
                    value={editForm.line2}
                    onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, line2: e.target.value }) : prev)}
                  />
                  <Select
                    label="País"
                    value={editForm.country}
                    onChange={(value) => setEditForm((prev) => prev ? ({ ...prev, country: String(value) }) : prev)}
                    options={latamCountries}
                    error={editErrors.country || undefined}
                  />
                  {editErrors.country ? <p className="text-xs text-[var(--color-danger)]">{editErrors.country}</p> : null}
                  <Select
                    label="Región"
                    value={editForm.regionId}
                    onChange={(value) => {
                      setEditForm((prev) => prev ? ({ ...prev, regionId: String(value), communeId: "" }) : prev);
                      setEditErrors((prev) => ({ ...prev, regionId: "", communeId: "" }));
                      loadCommunesEdit(String(value));
                    }}
                    options={regions}
                    placeholder={loadingRegions ? "Cargando..." : "Región"}
                    disabled={loadingRegions}
                    error={editErrors.regionId || undefined}
                  />
                  {editErrors.regionId ? <p className="text-xs text-[var(--color-danger)]">{editErrors.regionId}</p> : null}
                  <Select
                    label="Comuna"
                    value={editForm.communeId}
                    onChange={(value) => {
                      setEditForm((prev) => prev ? ({ ...prev, communeId: String(value) }) : prev);
                      setEditErrors((prev) => ({ ...prev, communeId: "" }));
                    }}
                    options={communesEdit}
                    placeholder={!editForm.regionId ? "Selecciona una región" : loadingCommunesEdit ? "Cargando..." : "Comuna"}
                    disabled={!editForm.regionId || loadingCommunesEdit}
                    error={editErrors.communeId || undefined}
                  />
                  {editErrors.communeId ? <p className="text-xs text-[var(--color-danger)]">{editErrors.communeId}</p> : null}
                  <Input
                    label="Código postal (opcional)"
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, postalCode: e.target.value }) : prev)}
                  />
                  <label className="flex items-center gap-2 text-sm text-lighttext dark:text-darktext">
                    <input
                      type="checkbox"
                      checked={editForm.isDefault}
                      onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, isDefault: e.target.checked }) : prev)}
                      className="accent-primary"
                    />
                    <span>Marcar como principal</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="subtle" onClick={handleCancelEdit} leftIcon={<IconX size={14} />}>Cancelar</Button>
                  <Button size="sm" onClick={handleUpdate} loading={saving} leftIcon={<IconCheck size={14} />}>Guardar cambios</Button>
                </div>
                </>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-lighttext dark:text-darktext">
                      <IconHome size={16} />
                      <span>{typeLabels[addr.type] || "Dirección"}</span>
                      {addr.is_default ? <span className="text-xs text-primary bg-[var(--color-primary-a10)] px-2 py-0.5 rounded-full">Principal</span> : null}
                    </div>
                    <div className="text-sm text-lighttext/80 dark:text-darktext/80 break-words">
                      {addr.label ? addr.label + " • " : ""}{addr.line1}{addr.line2 ? ", " + addr.line2 : ""}
                    </div>
                    <div className="text-xs text-lighttext/60 dark:text-darktext/60">
                      {[addr.commune_name, addr.region_name, addr.country].filter(Boolean).join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditStart(addr)} leftIcon={<IconPencil size={14} />}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(addr.id)} leftIcon={<IconTrash size={14} />}>Eliminar</Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProfileAddresses;
