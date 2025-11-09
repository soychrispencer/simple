"use client";
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useAuth } from '@/context/AuthContext';
import React from "react";
import Input from "@/components/ui/form/Input";
import Select from "@/components/ui/form/Select";
import TextArea from "@/components/ui/form/TextArea";
import FormStepper from "@/components/ui/form/FormStepper";
import { regiones, comunasPorRegion, tiposVehiculo, tiposLista, estados } from "@/lib/options"; // TODO: refactor options to English in later pass
import { ListingKind, VehicleCategory, EstadoVehiculo, CondicionesComerciales } from '@/types/vehicle';
import { Button } from "@/components/ui/Button";
import GalleryImageUploader from "@/components/ui/uploader/GalleryImageUploader";
import { getJSON, remove, setJSON } from "@/lib/storage";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { fileToDataURL, dataURLToFile } from "@/lib/image";

const parseList = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

// New English-oriented form model (keeps Spanish labels only in UI for now)
type Form = {
  basic: { title: string; listing_kind: ListingKind | ''; type_key: VehicleCategory | ''; estado: EstadoVehiculo | ''; price: string; year: string; mileage_km: string; };
  specs: { brand: string; model: string; version: string; color: string; engine: string; doors: string | number; transmission: string; fuel_type: string; power_hp: string; consumption: string; drivetrain: string; };
  location: { region: string; commune: string; address: string; };
  media: { video_url: string; };
  extra: { financing: string; exchange: string; visibility: string; publish_date: string; expire_date: string; equipment: string; documentation: string; owners: string; historial: string; condiciones_flags: string; condiciones_notas: string; };
};

const defaultForm: Form = {
  basic: { title: '', listing_kind: '', type_key: '', estado: '', price: '', year: '', mileage_km: '' },
  specs: { brand: '', model: '', version: '', color: '', engine: '', doors: '', transmission: '', fuel_type: '', power_hp: '', consumption: '', drivetrain: '' },
  location: { region: regiones[0]?.value || 'rm', commune: '', address: '' },
  media: { video_url: '' },
  extra: { financing: 'no', exchange: 'no', visibility: 'normal', publish_date: '', expire_date: '', equipment: '', documentation: '', owners: '', historial: '', condiciones_flags: '', condiciones_notas: '' },
};

// Normaliza un draft (antiguo o nuevo) al shape actual
function normalizeForm(raw: any): Form {
  if (!raw || typeof raw !== 'object') return defaultForm;
  // Soportar claves legacy en español
  const basicSrc = raw.basic || raw.basicos || {};
  const specsSrc = raw.specs || raw.especificaciones || {};
  const locSrc = raw.location || raw.ubicacion || {};
  const mediaSrc = raw.media || raw.multimedia || {};
  const extraSrc = raw.extra || raw.extras || {};
  // Mapear legacy fields -> estado canónico y mantener strings auxiliares
  const basicNormalized = { ...basicSrc } as any;
  const estadoLegacy = basicNormalized?.estado ?? basicNormalized?.condition ?? basicNormalized?.state ?? '';
  basicNormalized.estado = estadoLegacy as EstadoVehiculo | '';
  delete basicNormalized.condition;

  const extraNormalized = { ...extraSrc } as any;
  if (!extraNormalized.historial && Array.isArray(extraSrc?.historial)) {
    extraNormalized.historial = extraSrc.historial.join(', ');
  }
  if (!extraNormalized.condiciones_flags) {
    const flagsSource = extraSrc?.condiciones?.flags || extraSrc?.conditions_flags || extraSrc?.condiciones_flags;
    extraNormalized.condiciones_flags = Array.isArray(flagsSource) ? flagsSource.join(', ') : (flagsSource || '');
  }
  if (!extraNormalized.condiciones_notas) {
    extraNormalized.condiciones_notas = extraSrc?.condiciones?.notas ?? extraSrc?.conditions_notes ?? extraSrc?.condiciones_notas ?? '';
  }
  const merged: Form = {
    basic: { ...defaultForm.basic, ...basicNormalized },
    specs: { ...defaultForm.specs, ...specsSrc },
    location: { ...defaultForm.location, ...locSrc },
    media: { ...defaultForm.media, ...mediaSrc },
  extra: { ...defaultForm.extra, ...extraNormalized },
  };
  // Asegurar región válida
  if (!merged.location.region) merged.location.region = defaultForm.location.region;
  return merged;
}

export default function VehicleForm({ onPublish }: { onPublish?: (item: any) => void }) {
  const supabase = useSupabase();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = React.useState(() => getJSON("pub:step", "basicos"));
  const [form, setForm] = React.useState<Form>(() => normalizeForm(getJSON("pub:form", defaultForm)));
  const [images, setImages] = React.useState<any[]>(() => getJSON("pub:images", []));
  const [region, setRegion] = React.useState<string>(() => {
    const f = normalizeForm(getJSON("pub:form", defaultForm));
    return f.location.region;
  });
  const comunas = React.useMemo(() => comunasPorRegion[region] || [], [region]);

  const steps = [
    { key: "basicos", label: "Básicos" },
    { key: "especificaciones", label: "Especificaciones" },
    { key: "ubicacion", label: "Ubicación" },
    { key: "multimedia", label: "Multimedia" },
    { key: "extras", label: "Extras" },
  ];

  React.useEffect(() => { setJSON("pub:form", form); }, [form]);
  React.useEffect(() => { setJSON("pub:step", step); }, [step]);
  React.useEffect(() => { setJSON("pub:images", images); }, [images]);

  const gotoPrev = () => {
    const idx = steps.findIndex((s) => s.key === step);
    if (idx > 0) setStep(steps[idx - 1].key);
  };
  const validateStep = (key: string): boolean => {
    if (key === 'basicos' || key === 'basic') {
  const b = form.basic;
	if (!b.title || !b.listing_kind || !b.type_key || !b.estado) return addToast('Completa los datos básicos', { type: 'error' }), false;
      const precio = Number(b.price); const anio = Number(b.year);
      if (!precio || precio <= 0) return addToast("Precio inválido", { type: "error" }), false;
      const currentYear = new Date().getFullYear();
      if (!anio || anio < 1900 || anio > currentYear + 1) return addToast("Año inválido", { type: "error" }), false;
    }
    if (key === 'ubicacion' || key === 'location') {
      const u = form.location;
      if (!u.region || !u.commune) return addToast('Selecciona región y comuna', { type: 'error' }), false;
    }
    if (key === 'multimedia' || key === 'media') {
      if (!images || images.length < 1) return addToast("Agrega al menos una imagen", { type: "error" }), false;
    }
    return true;
  };
  const gotoNext = () => {
    const idx = steps.findIndex((s) => s.key === step);
    if (idx < steps.length - 1) {
      const ok = validateStep(step);
      if (!ok) return;
      setStep(steps[idx + 1].key);
    }
  };
  const validateAll = (): boolean => {
    return ['basicos', 'ubicacion', 'multimedia'].every((k) => validateStep(k));
  };

  const [publishing, setPublishing] = React.useState(false);
  const publish = async () => {
    if (!validateAll()) return;
    try {
      setPublishing(true);
      // 1) Subir imágenes al backend
      const uploaded: string[] = [];
      for (const it of images as any[]) {
        let file: File | null = null;
        if (it.file instanceof File) file = it.file as File;
        else if (it.dataUrl) file = dataURLToFile(it.dataUrl, 'image.webp');
        if (!file) continue;
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!up.ok) throw new Error('No se pudo subir imagen');
        const { url } = await up.json();
        uploaded.push(url);
      }

      // Crear vehículo en Supabase
      // Build VehicleBase insert payload (minimum required fields)
  const basic = form.basic;
      const specs = form.specs;
      const loc = form.location;
      const extra = form.extra;
      const estado = (basic.estado || 'used') as EstadoVehiculo;
  const historial = Array.from(new Set(parseList(extra.historial)));
      const condicionesFlags = Array.from(new Set(parseList(extra.condiciones_flags)));
      const condiciones: CondicionesComerciales = {
        flags: condicionesFlags,
        notas: extra.condiciones_notas?.trim() ? extra.condiciones_notas.trim() : null,
      };
      const nowISO = new Date().toISOString();
      const documentList = extra.documentation ? extra.documentation.split(',').map(s => s.trim()).filter(Boolean) : [];
      const equipmentList = extra.equipment ? extra.equipment.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const visibility = extra.visibility === 'destacado' ? 'featured' : (extra.visibility === 'oculto' ? 'hidden' : 'normal');
      const isFeaturedVisibility = visibility === 'featured';
      // IMPORTANTE: el esquema de DB usa listing_type, mileage, image_urls.
      // El formulario mantiene nombres legacy (listing_kind, mileage_km, image_paths) solo internamente.
      const insertPayload: any = {
        owner_id: user?.id,
        type_id: 1, // TODO: resolver FK real según type_key seleccionado
        title: basic.title,
        description: null,
        listing_type: basic.listing_kind || 'sale',
        price: Number(basic.price) || 0,
        year: Number(basic.year) || null,
        mileage: Number(basic.mileage_km) || 0,
        brand_id: null,
        model_id: null,
        color: specs.color || null,
        region_id: null,
        commune_id: null,
        image_urls: uploaded, // campo real en DB
        video_url: form.media.video_url || null,
        document_urls: documentList,
        visibility,
        featured: isFeaturedVisibility,
        allow_financing: extra.financing === 'si',
        allow_exchange: extra.exchange === 'si',
        created_at: nowISO,
        updated_at: nowISO,
        published_at: extra.publish_date ? extra.publish_date + 'T00:00:00.000Z' : nowISO,
        expires_at: extra.expire_date ? extra.expire_date + 'T00:00:00.000Z' : null,
        extra_specs: {
          estado,
          historial,
          condiciones,
          main_image: uploaded[0] || null,
          location: {
            region_code: loc.region || null,
            commune_code: loc.commune || null,
            address: loc.address || null,
          },
          type_key: basic.type_key || 'car',
          version: specs.version || null,
          equipment: equipmentList,
          documentation: documentList,
          // Persistimos claves legacy para compatibilidad
          condition: estado,
          state: estado,
          condition_tags: historial,
          status_tags: historial,
          commercial_conditions: condiciones,
          conditions_notes: condiciones.notas,
          legacy: {
            brand_name: specs.brand,
            model_name: specs.model,
            engine: specs.engine,
            doors: specs.doors,
            transmission_legacy: specs.transmission,
            fuel_legacy: specs.fuel_type,
            drivetrain: specs.drivetrain,
            power_hp: specs.power_hp,
            consumption: specs.consumption,
            owners: extra.owners,
            address: loc.address,
            region_code: loc.region,
            commune_code: loc.commune
          }
        },
        auction_start_price: null,
        auction_start_at: null,
        auction_end_at: null,
        rent_daily_price: null,
        rent_weekly_price: null,
        rent_security_deposit: null
      };

      const { error: insertError } = await supabase.from('vehicles').insert([insertPayload]);
      if (insertError) throw insertError;
      onPublish?.(form);

      // Limpiar borrador local
      remove("pub:form");
      remove("pub:step");
      remove("pub:images");
      setForm(defaultForm);
  setRegion(defaultForm.location.region);
      setImages([]);
      setStep("basicos");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };
  const exportDraft = () => {
    const data = { form, images };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `borrador-publicacion.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Borrador exportado", { type: "success" });
  };

  const importDraft = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.form) {
        const nf = normalizeForm(data.form);
        setForm(nf);
        setRegion(nf.location.region);
      }
      if (data.images) setImages(data.images);
      addToast("Borrador importado", { type: "success" });
    } catch {
      addToast("Archivo inválido", { type: "error" });
    }
  };

  return (
  <div className="w-full bg-lightcard dark:bg-darkcard rounded-2xl shadow-card p-6">
  <h2 className="text-2xl font-bold mb-2 text-lighttext dark:text-darktext">Publicación de vehículo</h2>
      <FormStepper steps={steps} current={step} />

    {step === 'basicos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="Título" placeholder="Ej: Toyota Corolla 2020 SE" value={form.basic.title} onChange={(e)=>setForm({...form, basic:{...form.basic, title: e.target.value}})} shape="pill" />
  <Select label="Tipo de lista" value={form.basic.listing_kind} onChange={val=>setForm({...form, basic:{...form.basic, listing_kind: val as any}})} options={tiposLista} shape="pill" />
  <Select label="Tipo de vehículo" value={form.basic.type_key} onChange={val=>setForm({...form, basic:{...form.basic, type_key: val as any}})} options={tiposVehiculo} shape="pill" />
  <Select
    label="Estado"
    value={form.basic.estado}
    onChange={val => {
      const next = val ? (String(val) as EstadoVehiculo) : '';
      setForm({ ...form, basic: { ...form.basic, estado: next } });
    }}
    options={estados}
    shape="pill"
  />
  <Input label="Precio" type="number" placeholder="$" value={form.basic.price} onChange={(e)=>setForm({...form, basic:{...form.basic, price: e.target.value}})} shape="pill" />
  <Input label="Año" type="number" min={1900} max={2099} value={form.basic.year} onChange={(e)=>setForm({...form, basic:{...form.basic, year: e.target.value}})} shape="pill" />
  <Input label="Kilometraje" type="number" value={form.basic.mileage_km} onChange={(e)=>setForm({...form, basic:{...form.basic, mileage_km: e.target.value}})} shape="pill" />
        </div>
      )}

    {step === 'especificaciones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="Marca" value={form.specs.brand} onChange={(e)=>setForm({...form, specs:{...form.specs, brand: e.target.value}})} shape="pill" />
  <Input label="Modelo" value={form.specs.model} onChange={(e)=>setForm({...form, specs:{...form.specs, model: e.target.value}})} shape="pill" />
  <Input label="Versión" value={form.specs.version} onChange={(e)=>setForm({...form, specs:{...form.specs, version: e.target.value}})} shape="pill" />
  <Input label="Color" value={form.specs.color} onChange={(e)=>setForm({...form, specs:{...form.specs, color: e.target.value}})} shape="pill" />
  <Input label="Motor" value={form.specs.engine} onChange={(e)=>setForm({...form, specs:{...form.specs, engine: e.target.value}})} shape="pill" />
  <Select label="Puertas" value={form.specs.doors as any} onChange={val=>setForm({...form, specs:{...form.specs, doors: String(val)}})} options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))} shape="pill" />
  <Input label="Transmisión" value={form.specs.transmission} onChange={(e)=>setForm({...form, specs:{...form.specs, transmission: e.target.value}})} shape="pill" />
  <Input label="Combustible" value={form.specs.fuel_type} onChange={(e)=>setForm({...form, specs:{...form.specs, fuel_type: e.target.value}})} shape="pill" />
  <Input label="Potencia (HP)" type="number" value={form.specs.power_hp} onChange={(e)=>setForm({...form, specs:{...form.specs, power_hp: e.target.value}})} shape="pill" />
  <Input label="Consumo (km/l)" value={form.specs.consumption} onChange={(e)=>setForm({...form, specs:{...form.specs, consumption: e.target.value}})} shape="pill" />
  <Input label="Tracción" value={form.specs.drivetrain} onChange={(e)=>setForm({...form, specs:{...form.specs, drivetrain: e.target.value}})} shape="pill" />
        </div>
      )}

      {step === 'ubicacion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Región"
            value={region}
            onChange={val => { setRegion(String(val)); setForm({...form, location:{...form.location, region: String(val), commune: ''}}); }}
            options={regiones}
          />
          <Select label="Comuna" value={form.location.commune} onChange={val=>setForm({...form, location:{...form.location, commune: String(val)}})} options={comunas} shape="pill" />
          <Input label="Dirección" placeholder="Calle 123, depto 456" className="md:col-span-2" value={form.location.address} onChange={(e)=>setForm({...form, location:{...form.location, address: e.target.value}})} shape="pill" />
        </div>
      )}

    {step === 'multimedia' && (
        <div className="space-y-4">
          <GalleryImageUploader value={images as any} onChange={async (items: any[]) => {
            // enrich items with dataURL to persist file content
            const withData = await Promise.all(items.map(async (it) => {
              if (!it.dataUrl) {
                const dataUrl = await fileToDataURL(it.file);
                return { ...it, dataUrl };
              }
              return it;
            }));
            setImages(withData as any);
          }} />
  <Input label="Video URL" placeholder="https://..." value={form.media.video_url} onChange={(e)=>setForm({...form, media:{...form.media, video_url: e.target.value}})} shape="pill" />
        </div>
      )}

      {step === 'extras' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Permite financiamiento" value={form.extra.financing} onChange={val=>setForm({...form, extra:{...form.extra, financing: String(val)}})} options={[{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }]} shape="pill" />
          <Select label="Permite permuta" value={form.extra.exchange} onChange={val=>setForm({...form, extra:{...form.extra, exchange: String(val)}})} options={[{ label: 'Sí', value: 'si' }, { label: 'No', value: 'no' }]} shape="pill" />
          <Select
            label="Visibilidad" value={form.extra.visibility} onChange={val=>setForm({...form, extra:{...form.extra, visibility: String(val)}})}
            options={[
              { label: "Destacado", value: "destacado" },
              { label: "Normal", value: "normal" },
              { label: "Oculto", value: "oculto" },
            ]}
          />
          <Input label="Fecha de publicación" type="date" value={form.extra.publish_date} onChange={(e)=>setForm({...form, extra:{...form.extra, publish_date: e.target.value}})} shape="pill" />
          <Input label="Fecha de vencimiento" type="date" value={form.extra.expire_date} onChange={(e)=>setForm({...form, extra:{...form.extra, expire_date: e.target.value}})} shape="pill" />
          <TextArea label="Equipamiento" placeholder="Airbag, Radio, Bluetooth..." rows={3} value={form.extra.equipment} onChange={(e)=>setForm({...form, extra:{...form.extra, equipment: e.target.value}})} />
          <TextArea label="Documentación" placeholder="Detalles de papeles y antecedentes" rows={3} value={form.extra.documentation} onChange={(e)=>setForm({...form, extra:{...form.extra, documentation: e.target.value}})} />
          <Input label="Número de dueños" type="number" min={1} value={form.extra.owners} onChange={(e)=>setForm({...form, extra:{...form.extra, owners: e.target.value}})} shape="pill" />
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
  <Button variant="neutral" shape="rounded" onClick={gotoPrev} disabled={step === steps[0].key}>Atrás</Button>
        <div className="flex gap-2">
          <Button variant="ghost" shape="rounded" onClick={exportDraft}>Exportar JSON</Button>
          <label className="cursor-pointer">{/* mantiene label con input oculto */}
            <Button variant="ghost" shape="rounded" className="interactive-scale" asChild>
              <span>Importar JSON</span>
            </Button>
            <input type="file" accept="application/json" className="hidden" onChange={(e)=> e.target.files && importDraft(e.target.files[0])} />
          </label>
          <Button variant="neutral" shape="rounded" onClick={()=>{ setJSON("pub:form", form); addToast("Borrador guardado", { type: "success" }); }}>Guardar borrador</Button>
          <Button variant="neutral" shape="rounded" onClick={()=>{ remove("pub:form"); remove("pub:step"); remove("pub:images"); setForm(defaultForm); setRegion(defaultForm.location.region); setImages([]); addToast("Borrador limpiado", { type: "info" }); }}>Limpiar borrador</Button>
          {step !== steps[steps.length - 1].key ? (
            <Button shape="rounded" onClick={gotoNext}>Siguiente</Button>
          ) : (
            <Button shape="rounded" onClick={publish} loading={publishing} disabled={publishing}>Publicar</Button>
          )}
        </div>
      </div>
    </div>
  );
}
