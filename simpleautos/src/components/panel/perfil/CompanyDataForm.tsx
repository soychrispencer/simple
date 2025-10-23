import React from "react";
import { useSupabase } from "@/lib/supabase/useSupabase";
import Input from "../../ui/form/Input";
import Select from "../../ui/form/Select";
import Button from "../../ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { IconBuilding, IconPhone, IconMail, IconMapPin, IconId, IconGlobe } from "@tabler/icons-react";

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

const CompanyDataForm: React.FC<{ empresa: any; onSave?: (data: any) => void }> = ({ empresa, onSave }) => {
  const supabase = useSupabase();
  const { addToast } = useToast();
  const [savingCompany, setSavingCompany] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  const [companyForm, setCompanyForm] = React.useState<CompanyFormState>({
    legal_name: empresa?.legal_name || "",
    tax_id: empresa?.tax_id || "",
    business_activity: empresa?.business_activity || "",
    address: empresa?.address || "",
    region_id: empresa?.region_id ? String(empresa.region_id) : "",
    commune_id: empresa?.commune_id ? String(empresa.commune_id) : "",
    website: empresa?.website || "",
    company_type: empresa?.company_type || "",
    business_type: empresa?.business_type || ""
  });

  const [contactForm, setContactForm] = React.useState<CompanyContactState>({
    phone: empresa?.phone || "",
    whatsapp: empresa?.whatsapp || "",
    email: empresa?.email || "",
    contact_name: empresa?.contact_name || ""
  });

  const [missingFields, setMissingFields] = React.useState<Record<string, boolean>>({});
  const [missingContactFields, setMissingContactFields] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    async function fetchCompany() {
      const userId = empresa?.user_id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[CompanyDataForm] Error fetching company', error);
        return;
      }

      if (data) {
        setCompanyForm({
          legal_name: data.legal_name || "",
          tax_id: data.tax_id || "",
          business_activity: data.business_activity || "",
          address: data.address || "",
          region_id: data.region_id ? String(data.region_id) : "",
          commune_id: data.commune_id ? String(data.commune_id) : "",
          website: data.website || "",
          company_type: data.company_type || "",
          business_type: data.business_type || ""
        });

        setContactForm({
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          email: data.email || "",
          contact_name: data.contact_name || ""
        });
      }
    }

    fetchCompany();
  }, [empresa?.user_id, supabase]);

  const [regions, setRegions] = React.useState<{ label: string; value: string }[]>([]);
  const [communes, setCommunes] = React.useState<{ label: string; value: string }[]>([]);

  React.useEffect(() => {
    async function fetchRegions() {
      const { data, error } = await supabase.from('regions').select('id, name').order('id');
      if (error) {
        console.error('[CompanyDataForm] Error fetching regions', error);
        return;
      }
      if (data) {
        setRegions(data.map((r: any) => ({ label: r.name, value: String(r.id) })));
      }
    }

    fetchRegions();
  }, [supabase]);

  React.useEffect(() => {
    async function fetchCommunes() {
      if (!companyForm.region_id) {
        setCommunes([]);
        return;
      }

      const { data, error } = await supabase
        .from('communes')
        .select('id, name')
        .eq('region_id', Number(companyForm.region_id))
        .order('name');

      if (error) {
        console.error('[CompanyDataForm] Error fetching communes', error);
        return;
      }

      setCommunes(data?.map((c: any) => ({ label: c.name, value: String(c.id) })) || []);
    }

    fetchCommunes();
  }, [companyForm.region_id, supabase]);

  const getUserId = async () => {
    let userId = empresa?.user_id;
    if (!userId) {
      const { data: authUser } = await supabase.auth.getUser();
      userId = authUser?.user?.id;
    }
    return userId;
  };

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

    const userId = await getUserId();
    if (!userId) {
      setErrorMsg('Error: usuario no autenticado');
      addToast('No se pudo identificar el usuario para guardar empresa.', { type: 'error' });
      setSavingCompany(false);
      return;
    }

    let DOMPurify: any = null;
    try {
      DOMPurify = require('isomorphic-dompurify');
    } catch (e) {}
    const sanitize = (val: string) => DOMPurify && typeof val === 'string' ? DOMPurify.sanitize(val.trim()) : (val && val.trim() !== "" ? val.trim() : null);

    const cleanCompanyForm = {
      legal_name: sanitize(companyForm.legal_name),
      tax_id: sanitize(companyForm.tax_id),
      business_activity: sanitize(companyForm.business_activity),
      address: sanitize(companyForm.address),
      region_id: companyForm.region_id ? Number(companyForm.region_id) : null,
      commune_id: companyForm.commune_id ? Number(companyForm.commune_id) : null,
      website: sanitize(companyForm.website),
      company_type: sanitize(companyForm.company_type),
      business_type: sanitize(companyForm.business_type)
    };

    const { data: existingCompany, error: selectError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId);

    if (selectError) {
      console.error('[CompanyDataForm] Error fetching company', selectError);
      addToast('No se pudieron guardar los datos de empresa.', { type: 'error' });
      setSavingCompany(false);
      return;
    }

    let operationError = null;

    if (!existingCompany || existingCompany.length === 0) {
      const { error: insertError } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          ...cleanCompanyForm
        });
      operationError = insertError;
    } else {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ...cleanCompanyForm
        })
        .eq('user_id', userId);
      operationError = updateError;
    }

    if (operationError) {
      console.error('[CompanyDataForm] Error saving company', operationError);
      setErrorMsg('Error al guardar datos de empresa: ' + operationError.message);
      addToast('No se pudieron guardar los datos de empresa.', { type: 'error' });
    } else {
      setErrorMsg("");
      addToast('¡Cambios guardados exitosamente!', { type: 'success' });
    }

    const { data: companyUpdated } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (companyUpdated) {
      setCompanyForm({
        legal_name: companyUpdated.legal_name || "",
        tax_id: companyUpdated.tax_id || "",
        business_activity: companyUpdated.business_activity || "",
        address: companyUpdated.address || "",
        region_id: companyUpdated.region_id ? String(companyUpdated.region_id) : "",
        commune_id: companyUpdated.commune_id ? String(companyUpdated.commune_id) : "",
        website: companyUpdated.website || "",
        company_type: companyUpdated.company_type || "",
        business_type: companyUpdated.business_type || ""
      });
    }

    onSave?.(companyUpdated || companyForm);
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

    const userId = await getUserId();
    if (!userId) {
      setErrorMsg('Error: usuario no autenticado');
      addToast('No se pudo identificar el usuario para guardar contacto.', { type: 'error' });
      setSavingContact(false);
      return;
    }

    const trimmed = (value: string) => (value && value.trim() !== "" ? value.trim() : null);

    const contactPayload = {
      phone: trimmed(contactForm.phone),
      whatsapp: trimmed(contactForm.whatsapp),
      email: contactForm.email.trim(),
      contact_person: trimmed(contactForm.contact_name)
    };

    const { data: existingCompany, error: selectError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId);

    if (selectError) {
      console.error('[CompanyDataForm] Error fetching company contacts', selectError);
      addToast('No se pudieron guardar los datos de contacto.', { type: 'error' });
      setSavingContact(false);
      return;
    }

    let operationError = null;

    if (!existingCompany || existingCompany.length === 0) {
      const { error: insertError } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          ...contactPayload
        });
      operationError = insertError;
    } else {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ...contactPayload
        })
        .eq('user_id', userId);
      operationError = updateError;
    }

    if (operationError) {
      console.error('[CompanyDataForm] Error saving contacts', operationError);
      setErrorMsg('Error al guardar contacto empresa: ' + operationError.message);
      addToast('No se pudieron guardar los datos de contacto.', { type: 'error' });
    } else {
      setErrorMsg("");
      addToast('¡Cambios guardados exitosamente!', { type: 'success' });
    }

    const { data: companyUpdated } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (companyUpdated) {
      setContactForm({
        phone: companyUpdated.phone || "",
        whatsapp: companyUpdated.whatsapp || "",
        email: companyUpdated.email || "",
        contact_name: companyUpdated.contact_name || ""
      });
    }

    onSave?.(companyUpdated || contactForm);
    setSavingContact(false);
  };

  return (
    <div className="w-full space-y-6">
      {errorMsg && (
        <div className="bg-red-100 text-red-700 rounded p-2 mb-4 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Tarjeta de Información de la Empresa */}
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <IconBuilding className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información de la Empresa</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos legales y comerciales de tu empresa</p>
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
                placeholder="Razón social de tu empresa"
                className="w-full"
                shape="rounded"
                required
              />
              {missingFields.legal_name && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Select
                label="Tipo de empresa"
                value={companyForm.company_type}
                onChange={value => setCompanyForm(f => ({ ...f, company_type: String(value) }))}
                options={[
                  { label: "EIRL", value: "EIRL" },
                  { label: "SpA", value: "SpA" },
                  { label: "Ltda.", value: "Ltda." },
                  { label: "SA", value: "SA" },
                  { label: "Otra", value: "Otra" }
                ]}
                placeholder="Selecciona tipo de empresa"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="RUT empresa"
                value={companyForm.tax_id}
                onChange={e => setCompanyForm(f => ({ ...f, tax_id: e.target.value }))}
                placeholder="12345678-9"
                className="w-full"
                shape="rounded"
                leftIcon={<IconId className="w-4 h-4 text-gray-400" />}
                required
              />
              {missingFields.tax_id && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
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
                placeholder="https://www.tuempresa.cl"
                className="w-full"
                shape="rounded"
                leftIcon={<IconGlobe className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Dirección"
                value={companyForm.address}
                onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Dirección completa de la empresa"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMapPin className="w-4 h-4 text-gray-400" />}
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
              {missingFields.region_id && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
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
              {missingFields.commune_id && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
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
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30">
              <IconPhone className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información de Contacto</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos para contactar a tu empresa</p>
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
                leftIcon={<IconPhone className="w-4 h-4 text-gray-400" />}
                required
              />
              {missingContactFields.phone && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
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
                leftIcon={<IconPhone className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="space-y-1">
              <Input
                type="email"
                label="Correo electrónico de empresa"
                value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                placeholder="contacto@tuempresa.cl"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMail className="w-4 h-4 text-gray-400" />}
                required
              />
              {missingContactFields.email && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
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

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
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
