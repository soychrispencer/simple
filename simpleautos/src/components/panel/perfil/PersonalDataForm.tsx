import React from "react";
import { useSupabase } from "@/lib/supabase/useSupabase";
import Input from "../../ui/form/Input";
import { IconCheck, IconUser, IconPhone, IconMail, IconMapPin, IconId } from "@tabler/icons-react";
import Select from "../../ui/form/Select";
import Button from "../../ui/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { getCountryOptionsEs } from '@/lib/countries';

type PersonalFormState = {
  firstName: string;
  lastName: string;
  rut: string;
  birthDate: string;
  gender: string;
  nationality: string;
  occupation: string;
};

type ContactFormState = {
  email: string;
  phone: string;
  address: string;
  regionId: string;
  communeId: string;
};

const PersonalDataForm: React.FC<{ user: any; onSave?: (data: any) => void }> = ({ user, onSave }) => {
  // Estado para el modal de cambio de correo
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [modalError, setModalError] = React.useState("");
  const [modalSuccess, setModalSuccess] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Validación de correo electrónico
  function validateEmail(email: string): boolean {
    return /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email);
  }
  const [emailError, setEmailError] = React.useState<string>("");

  // Validación de RUT chileno
  function validateRut(rut: string): boolean {
    // Formato: 7-8 dígitos + guion + dígito verificador (ej: 12345678-9)
    rut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;
    const body = rut.slice(0, -1);
    const dv = rut.slice(-1);
    let sum = 0, mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const expected = 11 - (sum % 11);
    const dvExpected = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
    return dv === dvExpected;
  }
  const [rutError, setRutError] = React.useState<string>("");

  const supabase = useSupabase();
  const { addToast } = useToast();

  const [savingPersonal, setSavingPersonal] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [missingFields, setMissingFields] = React.useState<{[key: string]: boolean}>({});

  const orderedCountryOptions = React.useMemo(() => getCountryOptionsEs(['CL']), []);

  const [personalForm, setPersonalForm] = React.useState<PersonalFormState>({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    rut: user?.rut || "",
    birthDate: user?.birth_date || "",
    gender: user?.gender || "",
    nationality: user?.nationality || "CL",
    occupation: user?.occupation || ""
  });

  const [contactForm, setContactForm] = React.useState<ContactFormState>({
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    regionId: user?.region_id ? String(user.region_id) : "",
    communeId: user?.commune_id ? String(user.commune_id) : ""
  });

  const [regiones, setRegiones] = React.useState<any[]>([]);
  const [comunas, setComunas] = React.useState<any[]>([]);
  const comunasFiltradas = React.useMemo(() => comunas.filter(c => String(c.region_id) === String(contactForm.regionId)), [comunas, contactForm.regionId]);

  React.useEffect(() => {
    // Obtener regiones y comunas directamente desde Supabase
    async function fetchRegiones() {
      const { data, error } = await supabase.from('regions').select('id, name').order('id');
      if (data) setRegiones(data);
      else console.log('Error regiones:', error);
    }
    async function fetchComunas() {
      const { data, error } = await supabase.from('communes').select('id, name, region_id').order('id');
      if (data) setComunas(data);
      else console.log('Error comunas:', error);
    }
    fetchRegiones();
    fetchComunas();
  }, [supabase]);

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    try {
      // Validar campos obligatorios
      const requiredFields = ['firstName', 'lastName', 'rut'];
      const missing: {[key: string]: boolean} = {};
      requiredFields.forEach(field => {
        if (!personalForm[field as keyof typeof personalForm]?.trim()) {
          missing[field] = true;
        }
      });

      // Validar RUT
      if (personalForm.rut && !validateRut(personalForm.rut)) {
        setRutError("RUT inválido");
        setSavingPersonal(false);
        return;
      } else {
        setRutError("");
      }

      if (Object.keys(missing).length > 0) {
        setMissingFields(missing);
        addToast("Por favor completa todos los campos obligatorios", { type: 'error' });
        setSavingPersonal(false);
        return;
      }

      // Verificar si el perfil existe, si no, crearlo
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      if (!existingProfile) {
        // Crear el perfil si no existe
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            first_name: personalForm.firstName,
            last_name: personalForm.lastName,
            rut: personalForm.rut,
            birth_date: personalForm.birthDate || null,
            gender: personalForm.gender || null,
            nationality: personalForm.nationality,
            occupation: personalForm.occupation || null
          });
        error = insertError;
      } else {
        // Actualizar el perfil existente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: personalForm.firstName,
            last_name: personalForm.lastName,
            rut: personalForm.rut,
            birth_date: personalForm.birthDate || null,
            gender: personalForm.gender || null,
            nationality: personalForm.nationality,
            occupation: personalForm.occupation || null
          })
          .eq('user_id', user.id);
        error = updateError;
      }

      if (error) {
        console.error('[PersonalDataForm] Error saving personal data:', error);
        addToast(`Error al guardar la información personal: ${error.message || 'Error desconocido'}`, { type: 'error' });
        setSavingPersonal(false);
        return;
      }

      addToast("Información personal guardada correctamente", { type: 'success' });
      setMissingFields({});
      onSave?.(personalForm);
    } catch (error: any) {
      console.error('[PersonalDataForm] Unexpected error saving personal data:', error);
      addToast("Error inesperado al guardar la información personal", { type: 'error' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      // Validar campos obligatorios
      const requiredFields = ['email', 'phone', 'regionId', 'communeId'];
      const missing: {[key: string]: boolean} = {};
      requiredFields.forEach(field => {
        if (!contactForm[field as keyof typeof contactForm]?.trim()) {
          missing[field] = true;
        }
      });

      // Validar email
      if (contactForm.email && !validateEmail(contactForm.email)) {
        setEmailError("Correo electrónico inválido");
        setSavingContact(false);
        return;
      } else {
        setEmailError("");
      }

      if (Object.keys(missing).length > 0) {
        setMissingFields(missing);
        addToast("Por favor completa todos los campos obligatorios", { type: 'error' });
        setSavingContact(false);
        return;
      }

      // Verificar si el perfil existe, si no, crearlo
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      if (!existingProfile) {
        // Crear el perfil si no existe
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: contactForm.email,
            phone: contactForm.phone,
            address: contactForm.address || null,
            region_id: contactForm.regionId ? parseInt(contactForm.regionId) : null,
            commune_id: contactForm.communeId ? parseInt(contactForm.communeId) : null
          });
        error = insertError;
      } else {
        // Actualizar el perfil existente
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: contactForm.email,
            phone: contactForm.phone,
            address: contactForm.address || null,
            region_id: contactForm.regionId ? parseInt(contactForm.regionId) : null,
            commune_id: contactForm.communeId ? parseInt(contactForm.communeId) : null
          })
          .eq('user_id', user.id);
        error = updateError;
      }

      if (error) {
        console.error('[PersonalDataForm] Error saving contact data:', error);
        addToast(`Error al guardar la información de contacto: ${error.message || 'Error desconocido'}`, { type: 'error' });
        setSavingContact(false);
        return;
      }

      addToast("Información de contacto guardada correctamente", { type: 'success' });
      setMissingFields({});
      onSave?.(contactForm);
    } catch (error: any) {
      console.error('[PersonalDataForm] Unexpected error saving contact data:', error);
      addToast("Error inesperado al guardar la información de contacto", { type: 'error' });
    } finally {
      setSavingContact(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      setModalError("Ingresa un correo electrónico");
      return;
    }
    if (!validateEmail(newEmail)) {
      setModalError("Correo electrónico inválido");
      return;
    }
    if (newEmail === user.email) {
      setModalError("El nuevo correo debe ser diferente al actual");
      return;
    }

    setSending(true);
    setModalError("");
    setModalSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setModalSuccess("Se ha enviado un enlace de confirmación al nuevo correo electrónico");
      setNewEmail("");
      setTimeout(() => setShowEmailModal(false), 3000);
    } catch (error: any) {
      setModalError(error.message || "Error al cambiar el correo");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Tarjeta de Información Personal */}
      <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <IconUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Personal</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos básicos de identificación</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Input
                type="text"
                label="Nombre"
                value={personalForm.firstName}
                onChange={e => setPersonalForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Tu nombre"
                className="w-full"
                shape="rounded"
              />
              {missingFields.firstName && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Apellido"
                value={personalForm.lastName}
                onChange={e => setPersonalForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Tu apellido"
                className="w-full"
                shape="rounded"
              />
              {missingFields.lastName && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="RUT"
                value={personalForm.rut}
                onChange={e => setPersonalForm(f => ({ ...f, rut: e.target.value }))}
                placeholder="12345678-9"
                className="w-full"
                shape="rounded"
                leftIcon={<IconId className="w-4 h-4 text-gray-400" />}
              />
              {missingFields.rut && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
              {rutError && <div className="text-xs text-red-600 mt-1">{rutError}</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="date"
                label="Fecha de nacimiento"
                value={personalForm.birthDate}
                onChange={e => setPersonalForm(f => ({ ...f, birthDate: e.target.value }))}
                className="w-full"
                shape="rounded"
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Género"
                value={personalForm.gender}
                onChange={value => setPersonalForm(f => ({ ...f, gender: String(value) }))}
                options={[
                  { label: 'Masculino', value: 'masculino' },
                  { label: 'Femenino', value: 'femenino' },
                  { label: 'Otro', value: 'otro' },
                  { label: 'Prefiero no decir', value: 'no_especificar' }
                ]}
                placeholder="Selecciona tu género"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Nacionalidad"
                value={personalForm.nationality}
                onChange={value => setPersonalForm(f => ({ ...f, nationality: String(value) }))}
                options={orderedCountryOptions}
                placeholder="Selecciona tu nacionalidad"
                className="w-full"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Ocupación"
                value={personalForm.occupation}
                onChange={e => setPersonalForm(f => ({ ...f, occupation: e.target.value }))}
                placeholder="Tu ocupación o profesión"
                className="w-full"
                shape="rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="px-8"
              onClick={handleSavePersonal}
              disabled={savingPersonal}
            >
              {savingPersonal ? 'Guardando...' : 'Guardar Información Personal'}
            </Button>
          </div>
        </div>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Datos para contactarte</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Input
                type="email"
                label="Correo electrónico"
                value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tu@email.com"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMail className="w-4 h-4 text-gray-400" />}
              />
              {missingFields.email && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
              {emailError && <div className="text-xs text-red-600 mt-1">{emailError}</div>}
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailModal(true)}
                  className="text-xs"
                >
                  Cambiar correo electrónico
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Input
                type="tel"
                label="Teléfono"
                value={contactForm.phone}
                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+56912345678"
                className="w-full"
                shape="rounded"
                leftIcon={<IconPhone className="w-4 h-4 text-gray-400" />}
              />
              {missingFields.phone && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Input
                type="text"
                label="Dirección"
                value={contactForm.address}
                onChange={e => setContactForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Tu dirección completa"
                className="w-full"
                shape="rounded"
                leftIcon={<IconMapPin className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="space-y-1">
              <Select
                label="Región"
                value={contactForm.regionId}
                onChange={value => setContactForm(f => ({ ...f, regionId: String(value), communeId: "" }))}
                options={regiones.map(r => ({ label: r.name, value: String(r.id) }))}
                placeholder="Selecciona tu región"
                className="w-full"
                shape="rounded"
                size="md"
              />
              {missingFields.regionId && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>

            <div className="space-y-1">
              <Select
                label="Comuna"
                value={contactForm.communeId}
                onChange={value => setContactForm(f => ({ ...f, communeId: String(value) }))}
                options={comunasFiltradas.map(c => ({ label: c.name, value: String(c.id) }))}
                placeholder="Selecciona tu comuna"
                className="w-full"
                shape="rounded"
                size="md"
              />
              {missingFields.communeId && <div className="text-xs text-red-600 mt-1">Este campo es obligatorio</div>}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200/50 dark:border-gray-700/50 mt-6">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="px-8"
              onClick={handleSaveContact}
              disabled={savingContact}
            >
              {savingContact ? 'Guardando...' : 'Guardar Información de Contacto'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de cambio de correo */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkcard rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cambiar Correo Electrónico</h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <IconCheck className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Input
                  type="email"
                  label="Nuevo correo electrónico"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="w-full"
                  shape="rounded"
                />
              </div>

              {modalError && <div className="text-xs text-red-600">{modalError}</div>}
              {modalSuccess && <div className="text-xs text-green-600">{modalSuccess}</div>}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleEmailChange}
                  disabled={sending}
                >
                  {sending ? 'Enviando...' : 'Enviar Confirmación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalDataForm;
