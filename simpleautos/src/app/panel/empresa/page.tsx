"use client";
import React from "react";
import Input from "../../../components/ui/form/Input";
import Select from "../../../components/ui/form/Select";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { IconBuilding, IconUser, IconCheck, IconLoader } from '@tabler/icons-react';

export default function Empresa() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const { addToast } = useToast();

  const [form, setForm] = React.useState({
    nombre_empresa: "",
    rut_empresa: "",
    direccion_empresa: "",
    region_empresa: "",
    comuna_empresa: "",
    telefono_empresa: "",
    email_empresa: "",
    sitio_web: ""
  });

  const [regiones, setRegiones] = React.useState<any[]>([]);
  const [comunas, setComunas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [converting, setConverting] = React.useState(false);

  // Cargar datos iniciales
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar regiones y comunas
        const [regionesRes, comunasRes] = await Promise.all([
          fetch('/api/regiones'),
          fetch('/api/comunas')
        ]);

        const regionesData = await regionesRes.json();
        const comunasData = await comunasRes.json();

        setRegiones(regionesData);
        setComunas(comunasData);

        // Si ya es empresa, cargar datos existentes
        if (profile?.user_type === 'company' && profile.empresa) {
          const empresa = profile.empresa;
          setForm({
            nombre_empresa: empresa.legal_name || "",
            rut_empresa: empresa.tax_id || "",
            direccion_empresa: empresa.address || "",
            region_empresa: empresa.region_id?.toString() || "",
            comuna_empresa: empresa.commune_id?.toString() || "",
            telefono_empresa: empresa.phone || "",
            email_empresa: empresa.email || "",
            sitio_web: empresa.website || ""
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [profile]);

  const comunasFiltradas = React.useMemo(
    () => comunas.filter(c => String(c.region_id) === form.region_empresa),
    [comunas, form.region_empresa]
  );

  const handleRegionChange = (value: string | number) => {
    setForm(f => ({ ...f, region_empresa: String(value), comuna_empresa: "" }));
  };

  const handleComunaChange = (value: string | number) => {
    setForm(f => ({ ...f, comuna_empresa: String(value) }));
  };

  const handleConvertToCompany = async () => {
    if (!user?.id) return;

    setConverting(true);
    try {
      // 1. Crear registro de empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          legal_name: form.nombre_empresa,
          tax_id: form.rut_empresa,
          address: form.direccion_empresa,
          region_id: form.region_empresa ? parseInt(form.region_empresa) : null,
          commune_id: form.comuna_empresa ? parseInt(form.comuna_empresa) : null,
          phone: form.telefono_empresa,
          email: form.email_empresa,
          website: form.sitio_web,
          contact_person: user.user_metadata?.full_name || user.email
        })
        .select('id')
        .single();

      if (companyError) throw companyError;

      // 2. Actualizar perfil de usuario a empresa
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'company',
          company_id: companyData.id
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      addToast('¡Cuenta convertida a empresa exitosamente!', { type: 'success' });

      // 3. Refrescar el perfil para actualizar el estado
      await refreshProfile();

    } catch (error: any) {
      console.error('Error converting to company:', error);
      addToast('Error al convertir cuenta: ' + error.message, { type: 'error' });
    } finally {
      setConverting(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!profile?.empresa?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          legal_name: form.nombre_empresa,
          tax_id: form.rut_empresa,
          address: form.direccion_empresa,
          region_id: form.region_empresa ? parseInt(form.region_empresa) : null,
          commune_id: form.comuna_empresa ? parseInt(form.comuna_empresa) : null,
          phone: form.telefono_empresa,
          email: form.email_empresa,
          website: form.sitio_web
        })
        .eq('id', profile.empresa.id);

      if (error) throw error;

      addToast('Datos de empresa actualizados exitosamente', { type: 'success' });
    } catch (error: any) {
      console.error('Error updating company:', error);
      addToast('Error al actualizar empresa: ' + error.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isCompany = profile?.user_type === 'company';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl mb-6">
          {isCompany ? (
            <IconBuilding size={32} className="text-primary" />
          ) : (
            <IconUser size={32} className="text-primary" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          {isCompany ? 'Mi Empresa' : 'Convertir a Empresa'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isCompany
            ? 'Gestiona la información de tu empresa'
            : 'Convierte tu cuenta individual a empresarial'
          }
        </p>
      </div>

      {/* Status Card */}
      <div className={`p-6 rounded-2xl border-2 ${
        isCompany
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isCompany
              ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
              : 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
          }`}>
            {isCompany ? <IconCheck size={24} /> : <IconBuilding size={24} />}
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              isCompany
                ? 'text-green-800 dark:text-green-200'
                : 'text-blue-800 dark:text-blue-200'
            }`}>
              {isCompany ? 'Cuenta Empresarial' : 'Cuenta Individual'}
            </h3>
            <p className={`text-sm ${
              isCompany
                ? 'text-green-600 dark:text-green-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {isCompany
                ? 'Tu cuenta está configurada como empresa'
                : 'Puedes convertir tu cuenta a empresarial completando el formulario'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-lightcard dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-8">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="text"
              label="Razón Social"
              value={form.nombre_empresa}
              onChange={e => setForm(f => ({ ...f, nombre_empresa: e.target.value }))}
              placeholder="Nombre legal de la empresa"
              required={!isCompany}
              shape="pill"
            />

            <Input
              type="text"
              label="RUT / ID Fiscal"
              value={form.rut_empresa}
              onChange={e => setForm(f => ({ ...f, rut_empresa: e.target.value }))}
              placeholder="Ej: 76.123.456-7"
              required={!isCompany}
              shape="pill"
            />

            <Input
              type="text"
              label="Dirección"
              value={form.direccion_empresa}
              onChange={e => setForm(f => ({ ...f, direccion_empresa: e.target.value }))}
              placeholder="Dirección de la empresa"
              shape="pill"
            />

            <Input
              type="tel"
              label="Teléfono"
              value={form.telefono_empresa}
              onChange={e => setForm(f => ({ ...f, telefono_empresa: e.target.value }))}
              placeholder="+56 9 1234 5678"
              shape="pill"
            />

            <Input
              type="email"
              label="Correo Electrónico"
              value={form.email_empresa}
              onChange={e => setForm(f => ({ ...f, email_empresa: e.target.value }))}
              placeholder="contacto@empresa.cl"
              shape="pill"
            />

            <Input
              type="url"
              label="Sitio Web"
              value={form.sitio_web}
              onChange={e => setForm(f => ({ ...f, sitio_web: e.target.value }))}
              placeholder="https://www.empresa.cl"
              shape="pill"
            />

            <Select
              label="Región"
              value={form.region_empresa}
              onChange={handleRegionChange}
              options={regiones.map(r => ({ label: r.nombre, value: r.id }))}
              placeholder="Selecciona región"
              shape="pill"
              size="md"
            />

            <Select
              label="Comuna"
              value={form.comuna_empresa}
              onChange={handleComunaChange}
              options={comunasFiltradas.map(c => ({ label: c.nombre, value: c.id }))}
              placeholder="Selecciona comuna"
              shape="pill"
              size="md"
              disabled={!form.region_empresa}
            />
          </div>

          {/* Botón de acción */}
          <div className="pt-6 border-t border-black/5 dark:border-white/10">
            {isCompany ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleUpdateCompany}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <IconLoader size={20} className="animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <IconCheck size={20} className="mr-2" />
                    Actualizar Empresa
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleConvertToCompany}
                disabled={converting || !form.nombre_empresa || !form.rut_empresa}
              >
                {converting ? (
                  <>
                    <IconLoader size={20} className="animate-spin mr-2" />
                    Convirtiendo...
                  </>
                ) : (
                  <>
                    <IconBuilding size={20} className="mr-2" />
                    Convertir a Empresa
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Información adicional para empresas */}
      {isCompany && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
            💡 Consejos para empresas
          </h3>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• Completa toda la información para aparecer en búsquedas</li>
            <li>• Las empresas verificadas tienen mayor confianza</li>
            <li>• Puedes gestionar múltiples publicaciones desde tu panel</li>
          </ul>
        </div>
      )}
    </div>
  );
}
