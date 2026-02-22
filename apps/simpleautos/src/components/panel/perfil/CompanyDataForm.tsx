import React from "react";
import { Input, Select, Button, useToast } from "@simple/ui";
import { IconBuildingStore, IconPhone, IconMail, IconMapPin, IconId, IconGlobe } from "@tabler/icons-react";
import { logError } from "@/lib/logger";
import { sortRegionsNorthToSouth } from "@/lib/geo/sortRegionsNorthToSouth";

type CompanyFormState = {
  legal_name: string;
  tax_id: string;
  business_activity: string;
  address: string;
  region_id: string;
  commune_id: string;
  website: string;
  company_type: string;
  business_type: string;
};

type CompanyContactState = {
  phone: string;
  whatsapp: string;
  email: string;
  contact_name: string;
};

type CompanyRecord = {
  id?: string;
  name?: string | null;
  rut?: string | null;
  industry?: string | null;
  description?: string | null;
  address?: string | null;
  region_id?: string | null;
  commune_id?: string | null;
  website?: string | null;
  company_type?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

const mapCompanyToFormState = (company?: CompanyRecord | null): CompanyFormState => ({
  legal_name: company?.name || "",
  tax_id: company?.rut || "",
  business_activity: company?.industry || "",
  address: company?.address || "",
  region_id: company?.region_id ? String(company.region_id) : "",
  commune_id: company?.commune_id ? String(company.commune_id) : "",
  website: company?.website || "",
  company_type: company?.company_type || "",
  business_type: company?.description || "",
});

const mapCompanyToContactState = (
  company?: CompanyRecord | null,
  permissions?: Record<string, any> | null,
): CompanyContactState => ({
  phone: company?.phone || "",
  whatsapp: company?.whatsapp || "",
  email: company?.email || "",
  contact_name: permissions?.contact_name || "",
});

type CompanyApiPayload = {
  company?: CompanyRecord | null;
  membershipId?: string | null;
  permissions?: Record<string, any> | null;
  error?: string;
};

const CompanyDataForm: React.FC<{ empresa: any; onSave?: (data: any) => void }> = ({ empresa, onSave }) => {
  const { addToast } = useToast();
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  const [companyForm, setCompanyForm] = React.useState<CompanyFormState>({
  legal_name: empresa?.legal_name || empresa?.name || "",
  tax_id: empresa?.tax_id || empresa?.rut || "",
  business_activity: empresa?.business_activity || empresa?.industry || "",
  address: empresa?.address || "",
  region_id: empresa?.region_id ? String(empresa.region_id) : "",
  commune_id: empresa?.commune_id ? String(empresa.commune_id) : "",
  website: empresa?.website || "",
  company_type: empresa?.company_type || "",
  business_type: empresa?.business_type || empresa?.description || ""
  });

  const [contactForm, setContactForm] = React.useState<CompanyContactState>({
  phone: empresa?.phone || "",
  whatsapp: empresa?.whatsapp || "",
  email: empresa?.email || "",
  contact_name: empresa?.contact_name || ""
  });

  const [companyId, setCompanyId] = React.useState<string | null>(empresa?.id || null);
  const [membershipId, setMembershipId] = React.useState<string | null>(null);
  const [membershipPermissions, setMembershipPermissions] = React.useState<Record<string, any>>({});

  const [missingFields, setMissingFields] = React.useState<Record<string, boolean>>({});
  const [missingContactFields, setMissingContactFields] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let active = true;

    async function fetchCompany() {
      const response = await fetch('/api/profile/company', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as CompanyApiPayload));
      if (!active) return;
      if (!response.ok) {
        logError('[CompanyDataForm] Error fetching company', payload);
        return;
      }

      if (payload?.company) {
        setCompanyId(payload.company.id ?? null);
        setMembershipId(payload.membershipId ?? null);
        setMembershipPermissions(payload.permissions || {});
        setCompanyForm(mapCompanyToFormState(payload.company));
        setContactForm(mapCompanyToContactState(payload.company, payload.permissions));
        onSave?.(payload.company);
      } else {
        setCompanyId(null);
        setMembershipId(null);
        setMembershipPermissions({});
      }
    }

    void fetchCompany();
    return () => {
      active = false;
    };
  }, [onSave]);

  const [regions, setRegions] = React.useState<{ label: string; value: string }[]>([]);
  const [communes, setCommunes] = React.useState<{ label: string; value: string }[]>([]);

  React.useEffect(() => {
    async function fetchRegions() {
      const response = await fetch('/api/geo?mode=regions', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        logError('[CompanyDataForm] Error fetching regions', payload);
        return;
      }
      const rows = Array.isArray((payload as { regions?: unknown[] }).regions)
        ? ((payload as { regions: Array<{ id: string | number; name: string; code?: string | null }> }).regions ?? [])
        : [];
      const sorted = sortRegionsNorthToSouth(rows as any);
      setRegions(sorted.map((r: any) => ({ label: r.name, value: String(r.id) })));
    }

    fetchRegions();
  }, []);

  React.useEffect(() => {
    async function fetchCommunes() {
      if (!companyForm.region_id) {
        setCommunes([]);
        return;
      }

      const params = new URLSearchParams({
        mode: 'communes',
        region_id: companyForm.region_id
      });
      const response = await fetch(`/api/geo?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        logError('[CompanyDataForm] Error fetching communes', payload);
        return;
      }
      const rows = Array.isArray((payload as { communes?: unknown[] }).communes)
        ? ((payload as { communes: Array<{ id: string | number; name: string }> }).communes ?? [])
        : [];
      setCommunes(rows.map((c) => ({ label: c.name, value: String(c.id) })));
    }

    fetchCommunes();
  }, [companyForm.region_id]);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCompany) return;
    setSavingCompany(true);

    const requiredFields = [
      { key: 'legal_name', label: 'Razón social' },
      { key: 'tax_id', label: 'RUT empresa' },
      { key: 'region_id', label: 'Región' },
      { key: 'commune_id', label: 'Comuna' }
    ];

    const missing: Record<string, boolean> = {};
    requiredFields.forEach(({ key }) => {
      if (!companyForm[key as keyof CompanyFormState] || String(companyForm[key as keyof CompanyFormState]).trim() === "") {
        missing[key] = true;
      }
    });

    if (Object.keys(missing).length > 0) {
      setMissingFields(missing);
      setSavingCompany(false);
      return;
    }

    setMissingFields({});

    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch {}
    const sanitize = (val: string) => DOMPurify && typeof val === 'string' ? DOMPurify.sanitize(val.trim()) : (val && val.trim() !== "" ? val.trim() : null);

    const cleanCompanyForm = {
      legal_name: sanitize(companyForm.legal_name),
      tax_id: sanitize(companyForm.tax_id),
      business_activity: sanitize(companyForm.business_activity),
      business_type: sanitize(companyForm.business_type),
      address: sanitize(companyForm.address),
      region_id: companyForm.region_id || null,
      commune_id: companyForm.commune_id || null,
      website: sanitize(companyForm.website),
      company_type: sanitize(companyForm.company_type)
    };

    const response = await fetch('/api/profile/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_company',
        companyId,
        company: cleanCompanyForm,
      }),
    });
    const payload = await response.json().catch(() => ({} as CompanyApiPayload));
    if (!response.ok) {
      logError('[CompanyDataForm] Error saving company', payload);
      setErrorMsg(`Error al guardar datos de empresa: ${payload?.error || 'error desconocido'}`);
      addToast('No se pudieron guardar los datos de empresa.', { type: 'error' });
      setSavingCompany(false);
      return;
    }

    const updatedCompany = payload?.company || null;
    setCompanyId(payload?.company?.id ?? companyId);
    setMembershipId(payload?.membershipId ?? membershipId);
    setMembershipPermissions(payload?.permissions || {});

    if (updatedCompany) {
      setCompanyForm(mapCompanyToFormState(updatedCompany));
      onSave?.(updatedCompany);
      setErrorMsg("");
      addToast('¡Cambios guardados exitosamente!', { type: 'success' });
    } else {
      onSave?.(companyForm);
      setErrorMsg("");
      addToast('¡Cambios guardados exitosamente!', { type: 'success' });
    }

    setSavingCompany(false);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingContact) return;
    setSavingContact(true);

    const requiredFields = [
      { key: 'phone', label: 'Teléfono' },
      { key: 'email', label: 'Correo electrónico' }
    ];

    const missing: Record<string, boolean> = {};
    requiredFields.forEach(({ key }) => {
      const value = contactForm[key as keyof CompanyContactState];
      if (!value || String(value).trim() === "") {
        missing[key] = true;
      }
    });

    if (Object.keys(missing).length > 0) {
      setMissingContactFields(missing);
      setSavingContact(false);
      return;
    }

    setMissingContactFields({});

    const trimmed = (value: string) => (value && value.trim() !== "" ? value.trim() : null);

    if (!companyId) {
      addToast('Primero completa la información de la empresa.', { type: 'error' });
      setSavingContact(false);
      return;
    }

    const contactPayload = {
      phone: trimmed(contactForm.phone),
      whatsapp: trimmed(contactForm.whatsapp),
      email: contactForm.email.trim(),
      contact_name: trimmed(contactForm.contact_name),
    };

    const response = await fetch('/api/profile/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_contact',
        companyId,
        contact: contactPayload,
      }),
    });
    const payload = await response.json().catch(() => ({} as CompanyApiPayload));
    if (!response.ok) {
      logError('[CompanyDataForm] Error saving contacts', payload);
      setErrorMsg(`Error al guardar contacto empresa: ${payload?.error || 'error desconocido'}`);
      addToast('No se pudieron guardar los datos de contacto.', { type: 'error' });
      setSavingContact(false);
      return;
    }

    const nextPermissions = payload.permissions || {};
    const companyUpdated = payload.company || null;
    setMembershipPermissions(nextPermissions);
    setMembershipId(payload.membershipId ?? membershipId);

    if (companyUpdated) {
      setContactForm(mapCompanyToContactState(companyUpdated, nextPermissions));
    }

    onSave?.(companyUpdated || contactForm);
    setErrorMsg("");
    addToast('¡Cambios guardados exitosamente!', { type: 'success' });
    setSavingContact(false);
  };

  return (
    <div className="w-full space-y-6">
      {errorMsg && (
        <div className="bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] border border-[var(--color-danger-subtle-border)] rounded p-2 mb-4 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Tarjeta de Información de la Empresa */}
      <div className="card-surface shadow-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-primary-a10)]">
              <IconBuildingStore className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Información de la Empresa</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Datos legales y comerciales de tu empresa</p>
            </div>
          </div>
        </div>

        <form className="p-6" onSubmit={handleCompanySubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Input
                type="text"
                label="Razón social"
                value={companyForm.legal_name}
                onChange={e => setCompanyForm(f => ({ ...f, legal_name: e.target.value }))}
                placeholder="Razón social de tu negocio"
                className="w-full"
                shape="rounded"
                required
              />
              {missingFields.legal_name && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Select
                label="Tipo legal"
                value={companyForm.company_type}
                onChange={value => setCompanyForm(f => ({ ...f, company_type: String(value) }))}
                options={[
                  { label: "EIRL", value: "EIRL" },
                  { label: "SpA", value: "SpA" },
                  { label: "Ltda.", value: "Ltda." },
                  { label: "SA", value: "SA" },
                  { label: "Otra", value: "Otra" }
                ]}
                placeholder="Selecciona tipo legal"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="RUT del negocio"
                value={companyForm.tax_id}
                onChange={e => setCompanyForm(f => ({ ...f, tax_id: e.target.value }))}
                placeholder="12345678-9"
                className="w-full"
                shape="rounded"
                leftIcon={<IconId className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
                required
              />
              {missingFields.tax_id && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Select
                label="Tipo de negocio"
                value={companyForm.business_type}
                onChange={value => setCompanyForm(f => ({ ...f, business_type: String(value) }))}
                options={[
                  { label: "Vendedor independiente", value: "independiente" },
                  { label: "Concesionaria", value: "concesionaria" },
                  { label: "Rent a Car", value: "rentacar" },
                  { label: "Otra", value: "otra" }
                ]}
                placeholder="Selecciona tipo de negocio"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Giro comercial"
                value={companyForm.business_activity}
                onChange={e => setCompanyForm(f => ({ ...f, business_activity: e.target.value }))}
                placeholder="Ej: Venta de vehículos"
                className="w-full"
                shape="rounded"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Sitio web"
                value={companyForm.website}
                onChange={e => setCompanyForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://www.tunegocio.app"
                className="w-full"
                shape="rounded"
                leftIcon={<IconGlobe className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Dirección"
                value={companyForm.address}
                onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Dirección completa del negocio"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMapPin className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Región"
                value={companyForm.region_id}
                onChange={value => setCompanyForm(f => ({ ...f, region_id: String(value), commune_id: "" }))}
                options={regions}
                placeholder="Selecciona tu región"
                className="w-full"
                shape="rounded"
                size="md"
              />
              {missingFields.region_id && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Select
                label="Comuna"
                value={companyForm.commune_id}
                onChange={value => setCompanyForm(f => ({ ...f, commune_id: String(value) }))}
                options={communes}
                placeholder="Selecciona tu comuna"
                className="w-full"
                shape="rounded"
                size="md"
                disabled={!companyForm.region_id}
              />
              {missingFields.commune_id && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>
          </div>

            <div className="flex justify-end pt-6 border-t border-border/60 mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="px-8"
              disabled={savingCompany}
            >
              {savingCompany ? 'Guardando...' : 'Guardar Información de Empresa'}
            </Button>
          </div>
        </form>
      </div>

      {/* Tarjeta de Información de Contacto */}
      <div className="card-surface shadow-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)]">
              <IconPhone className="w-5 h-5 text-[var(--color-success)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Información de Contacto</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Datos para contactar a tu empresa</p>
            </div>
          </div>
        </div>

        <form className="p-6" onSubmit={handleContactSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Input
                type="tel"
                label="Teléfono"
                value={contactForm.phone}
                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
                className="w-full"
                shape="rounded"
                leftIcon={<IconPhone className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
                required
              />
              {missingContactFields.phone && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="tel"
                label="WhatsApp"
                value={contactForm.whatsapp || ''}
                onChange={e => setContactForm(f => ({ ...f, whatsapp: e.target.value }))}
                placeholder="+56 9 1234 5678"
                className="w-full"
                shape="rounded"
                leftIcon={<IconPhone className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
              />
            </div>

            <div className="space-y-1">
              <Input
                type="email"
                label="Correo del negocio"
                value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contacto@tunegocio.app"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMail className="w-4 h-4 text-lighttext/60 dark:text-darktext/60" />}
                required
              />
              {missingContactFields.email && <div className="text-xs text-[var(--color-danger)] mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Nombre del contacto"
                value={contactForm.contact_name}
                onChange={e => setContactForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="Nombre de la persona de contacto"
                className="w-full"
                shape="rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-border/60 mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="px-8"
              disabled={savingContact}
            >
              {savingContact ? 'Guardando...' : 'Guardar Información de Contacto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyDataForm;







