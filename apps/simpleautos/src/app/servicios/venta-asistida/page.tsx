"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea, useToast } from "@simple/ui";
import {
  IconCheck,
  IconShieldCheck,
  IconSparkles,
  IconArrowRight,
  IconBrandInstagram,
  IconBrandTiktok,
  IconBrandFacebook,
  IconBrandWhatsapp,
} from "@tabler/icons-react";
import { useAuth } from "@/context/AuthContext";

type FormState = {
  company: string; // honeypot
  name: string;
  email: string;
  phone: string;
  city: string;
  listingId: string;
  vehicleType: "auto" | "moto" | "camioneta" | "camion" | "otro";
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  desiredPrice: string;
  notes: string;
  consent: boolean;
};

const initialState: FormState = {
  company: "",
  name: "",
  email: "",
  phone: "",
  city: "",
  listingId: "",
  vehicleType: "auto",
  brand: "",
  model: "",
  year: "",
  mileageKm: "",
  desiredPrice: "",
  notes: "",
  consent: true,
};

export default function VentaAsistidaServicePage() {
  const { addToast } = useToast();
  const router = useRouter();
  const { user, profile, supabase, loading } = useAuth() as any;
  const [form, setForm] = React.useState<FormState>(initialState);
  const [submitting, setSubmitting] = React.useState(false);
  const [submittedCode, setSubmittedCode] = React.useState<string | null>(null);
  const [useMyData, setUseMyData] = React.useState(true);
  const [myListings, setMyListings] = React.useState<Array<{ id: string; title: string | null; status?: string | null }>>([]);
  const [listingsLoading, setListingsLoading] = React.useState(false);

  const isLoggedIn = Boolean(!loading && user?.id);

  const resolvedName = React.useMemo(() => {
    const first = String((profile as any)?.first_name || "").trim();
    const last = String((profile as any)?.last_name || "").trim();
    const full = `${first} ${last}`.trim();
    return full || String((user as any)?.name || "").trim() || "";
  }, [profile, user]);

  const resolvedEmail = React.useMemo(() => {
    return (
      String((profile as any)?.contact_email || "").trim() ||
      String((user as any)?.email || "").trim() ||
      ""
    );
  }, [profile, user]);

  const resolvedPhone = React.useMemo(() => {
    return (
      String((profile as any)?.contact_phone || "").trim() ||
      String((profile as any)?.whatsapp || "").trim() ||
      String((user as any)?.phone || "").trim() ||
      ""
    );
  }, [profile, user]);

  React.useEffect(() => {
    if (!isLoggedIn) return;

    const hasAutoData = Boolean(resolvedName || resolvedEmail || resolvedPhone);
    if (hasAutoData) {
      setUseMyData(true);
      setForm((prev) => ({
        ...prev,
        name: prev.name || resolvedName,
        email: prev.email || resolvedEmail,
        phone: prev.phone || resolvedPhone,
      }));
    }
  }, [isLoggedIn, resolvedEmail, resolvedName, resolvedPhone]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMyListings() {
      if (!isLoggedIn || !supabase) return;
      setListingsLoading(true);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id,title,status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (cancelled) return;
        if (error) {
          setMyListings([]);
          return;
        }
        setMyListings((data || []).map((r: any) => ({ id: String(r.id), title: r.title ?? null, status: r.status ?? null })));
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    }

    void loadMyListings();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, supabase, user?.id]);

  const onChange = (key: keyof FormState) => (e: any) => {
    const value = e?.target?.type === "checkbox" ? Boolean(e.target.checked) : String(e.target.value);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const listingSelected = Boolean(form.listingId);
      const payload = {
        company: form.company,
        name: (useMyData && isLoggedIn ? resolvedName : form.name) || form.name,
        email: (useMyData && isLoggedIn ? resolvedEmail : form.email) || form.email,
        phone: (useMyData && isLoggedIn ? resolvedPhone : form.phone) || form.phone,
        city: form.city,
        listingId: form.listingId || undefined,
        vehicleType: listingSelected ? undefined : form.vehicleType,
        brand: listingSelected ? undefined : form.brand,
        model: listingSelected ? undefined : form.model,
        year: listingSelected ? undefined : form.year ? Number(form.year) : undefined,
        mileageKm: listingSelected ? undefined : form.mileageKm ? Number(form.mileageKm) : undefined,
        desiredPrice: listingSelected ? undefined : form.desiredPrice ? Number(form.desiredPrice) : undefined,
        notes: form.notes,
        consent: form.consent,
      };

      const res = await fetch("/api/services/venta-asistida", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data?.error || "No pudimos enviar tu solicitud.", { type: "error" });
        return;
      }

      const code = String((data as any)?.referenceCode || "").trim();
      const trackingToken = String((data as any)?.trackingToken || "").trim();
      setSubmittedCode(code || null);
      addToast(code ? `Solicitud enviada. Código: ${code}.` : "Solicitud enviada.", { type: "success" });
      setForm(initialState);

		  // Llevar a seguimiento para que el usuario pueda ver el estado
		  if (trackingToken) {
			  router.push(`/servicios/venta-asistida/seguimiento?token=${encodeURIComponent(trackingToken)}`);
		  } else if (code) {
			  router.push(`/servicios/venta-asistida/seguimiento?code=${encodeURIComponent(code)}`);
		  }
    } catch {
      addToast("Error inesperado. Intenta nuevamente.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl 2xl:max-w-[88rem] px-4 sm:px-6 lg:px-10 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-sm text-lighttext/80 dark:text-darktext/80">
          <IconSparkles size={16} stroke={1.7} />
          Venta asistida
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold text-lighttext dark:text-darktext">
          Venta asistida para vender tu auto, sin entregarlo
        </h1>
        <p className="mt-2 text-lighttext/80 dark:text-darktext/80 max-w-3xl">
          Tú mantienes el auto hasta el día de la venta. Nosotros gestionamos publicación, negociación y coordinación.
          Pagas comisión sólo si se vende.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card-surface shadow-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-primary">
              <IconShieldCheck size={22} stroke={1.6} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Simple, rápido y transparente</h2>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Nos dices qué necesitas y lo gestionamos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start gap-2">
                <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-lighttext dark:text-darktext">Evaluación y estrategia</div>
                  <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Revisamos tu caso y definimos el plan.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start gap-2">
                <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-lighttext dark:text-darktext">Gestión de interesados</div>
                  <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Filtramos, respondemos y coordinamos contigo.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start gap-2">
                <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-lighttext dark:text-darktext">Tu auto siempre contigo</div>
                  <div className="text-lighttext/80 dark:text-darktext/80 mt-1">No entregas el vehículo hasta concretar.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-start gap-2">
                <IconCheck size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-lighttext dark:text-darktext">Comisión sólo si se vende</div>
                  <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Si no hay venta, no hay cobro.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/60 bg-lightbg/60 dark:bg-darkbg/40 p-3 sm:p-4">
            <div className="text-sm font-semibold text-lighttext dark:text-darktext">Difusión multicanal</div>
            <div className="mt-1 text-sm text-lighttext/70 dark:text-darktext/70">
              Incluye fotos profesionales, video y publicación en portales más conocidos.
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-lighttext/80 dark:text-darktext/80">
              <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 px-3 py-2 leading-tight">
                <IconBrandInstagram size={18} stroke={1.5} className="shrink-0 text-[var(--color-primary)]" />
                <span>Instagram</span>
              </div>
              <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 px-3 py-2 leading-tight">
                <IconBrandTiktok size={18} stroke={1.5} className="shrink-0 text-[var(--color-primary)]" />
                <span>TikTok</span>
              </div>
              <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 px-3 py-2 leading-tight">
                <IconBrandFacebook size={18} stroke={1.5} className="shrink-0 text-[var(--color-primary)]" />
                <span>Facebook</span>
              </div>
              <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border/60 px-3 py-2 leading-tight">
                <IconBrandWhatsapp size={18} stroke={1.5} className="shrink-0 text-[var(--color-primary)]" />
                <span>WhatsApp</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-lighttext/70 dark:text-darktext/70">
            ¿Prefieres publicar por tu cuenta? <Link href="/panel/publicar-vehiculo?new=1" className="text-primary hover:underline">Publica tu vehículo</Link>.
          </div>
        </div>

        <div className="card-surface shadow-card p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Solicita tu evaluación</h2>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4">
            Déjanos tus datos y te contactamos para validar el vehículo y estimar tiempos/comisión.
          </p>

          {submittedCode ? (
            <div className="mb-4 rounded-xl border border-border/60 bg-lightbg/60 dark:bg-darkbg/40 p-4">
              <div className="text-sm font-semibold text-lighttext dark:text-darktext">Solicitud enviada</div>
              <div className="mt-1 text-sm text-lighttext/80 dark:text-darktext/80">
                Tu código de seguimiento es <span className="font-semibold">{submittedCode}</span>.
              </div>
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(submittedCode).catch(() => {})}>
                  Copiar código
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/servicios/venta-asistida/seguimiento?code=${encodeURIComponent(submittedCode)}`)}
                >
                  Ver seguimiento
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-3">
            {/* Honeypot */}
            <input
              value={form.company}
              onChange={onChange("company")}
              name="company"
              autoComplete="off"
              tabIndex={-1}
              className="hidden"
              aria-hidden
            />

            {isLoggedIn && (
              <label className="flex items-center gap-2 text-sm text-lighttext/80 dark:text-darktext/80">
                <input
                  type="checkbox"
                  checked={useMyData}
                  onChange={(e) => setUseMyData(Boolean(e.target.checked))}
                />
                Usar mis datos de cuenta (recomendado)
              </label>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nombre"
                value={useMyData && isLoggedIn ? resolvedName : form.name}
                onChange={onChange("name")}
                placeholder="Tu nombre"
                required
                disabled={useMyData && isLoggedIn}
              />
              <Input
                label="Teléfono"
                value={useMyData && isLoggedIn ? resolvedPhone : form.phone}
                onChange={onChange("phone")}
                placeholder="+56 9 ..."
                required
                disabled={useMyData && isLoggedIn}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Email"
                value={useMyData && isLoggedIn ? resolvedEmail : form.email}
                onChange={onChange("email")}
                placeholder="tu@email.com"
                required
                disabled={useMyData && isLoggedIn}
              />
              <Input label="Ciudad" value={form.city} onChange={onChange("city")} placeholder="Santiago" />
            </div>

            {isLoggedIn && (
              <div>
                <Select
                  label="¿Ya lo tienes publicado en SimpleAutos?"
                  value={form.listingId}
                  onChange={(value) => setForm((p) => ({ ...p, listingId: String(value || "") }))}
                  options={[
                    { value: "", label: listingsLoading ? "Cargando publicaciones..." : "No, aún no tengo publicación" },
                    ...(!listingsLoading
                      ? myListings.map((l) => ({
                          value: l.id,
                          label: `${l.title || "Sin título"}${l.status ? ` (${l.status})` : ""}`,
                        }))
                      : []),
                  ]}
                />
                <div className="mt-1 text-xs text-lighttext/70 dark:text-darktext/70">
                  Si seleccionas una publicación, usaremos esos datos para revisar tu vehículo (no necesitas volver a completar el detalle).
                </div>
              </div>
            )}

            {!form.listingId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select
                    label="Tipo"
                    value={form.vehicleType}
                    onChange={(value) => setForm((p) => ({ ...p, vehicleType: value as FormState["vehicleType"] }))}
                    options={[
                      { value: "auto", label: "Auto" },
                      { value: "moto", label: "Moto" },
                      { value: "camioneta", label: "Camioneta" },
                      { value: "camion", label: "Camión" },
                      { value: "otro", label: "Otro" },
                    ]}
                  />
                  <Input label="Marca" value={form.brand} onChange={onChange("brand")} placeholder="Toyota" />
                  <Input label="Modelo" value={form.model} onChange={onChange("model")} placeholder="Corolla" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Año" value={form.year} onChange={onChange("year")} placeholder="2018" />
                  <Input label="Kilometraje (km)" value={form.mileageKm} onChange={onChange("mileageKm")} placeholder="85000" />
                  <Input label="Precio esperado (CLP)" value={form.desiredPrice} onChange={onChange("desiredPrice")} placeholder="9500000" />
                </div>
              </>
            )}

            <Textarea label="Notas" value={form.notes} onChange={onChange("notes")} placeholder="Detalles: estado, mantenciones, si aceptas permuta, etc." />

            <label className="flex items-center gap-2 text-sm text-lighttext/80 dark:text-darktext/80">
              <input type="checkbox" checked={form.consent} onChange={onChange("consent")} />
              Acepto ser contactado por SimpleAutos para gestionar la venta.
            </label>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" disabled={submitting} rightIcon={<IconArrowRight size={18} />}>
                {submitting ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>

            <div className="text-xs text-lighttext/70 dark:text-darktext/70">
              Al enviar, aceptas nuestro contacto para esta solicitud. No hay cobro si no se vende.
            </div>
          </form>
        </div>
      </div>

      <div className="mt-10 card-surface shadow-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Por qué la venta asistida funciona</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-border/60 p-4">
            <div className="font-semibold text-lighttext dark:text-darktext">Más velocidad</div>
            <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Publicación optimizada + respuesta rápida a interesados.</div>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <div className="font-semibold text-lighttext dark:text-darktext">Más transparencia</div>
            <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Acompañamiento y decisiones contigo (sin sorpresas).</div>
          </div>
          <div className="rounded-xl border border-border/60 p-4">
            <div className="font-semibold text-lighttext dark:text-darktext">Pago sólo al vender</div>
            <div className="text-lighttext/80 dark:text-darktext/80 mt-1">Modelo por comisión: si no hay venta, no hay cobro.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
