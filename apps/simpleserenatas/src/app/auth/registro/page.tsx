'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconEye, IconEyeOff, IconExternalLink, IconHeart, IconMusic } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { ModernSelect } from '@simple/ui';
import { AuthFeedback } from '@/components/auth/auth-feedback';
import { BrandLogo } from '@simple/ui';
import { AUTH_PASSWORD_MIN_LENGTH, getPasswordStrength, normalizeEmail } from '@simple/auth';

const instruments = [
  'Voz',
  'Guitarra',
  'Guitarrón',
  'Violín',
  'Trompeta',
  'Vihuela',
  'Saxofón',
  'Bajo',
  'Piano',
  'Batería',
  'Teclado',
  'Percusión',
  'Charango',
  'Cuatro',
  'Acordeón',
  'Otros',
];
let googlePlacesScriptPromise: Promise<boolean> | null = null;
let googlePlacesStylesInjected = false;

function loadGooglePlacesScript(apiKey: string, retries = 2): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const googleMaps = (window as Window & { google?: any }).google?.maps;
  if (googleMaps?.places?.Autocomplete) return Promise.resolve(true);
  if (googlePlacesScriptPromise) return googlePlacesScriptPromise;

  googlePlacesScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places="register"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => {
        googlePlacesScriptPromise = null;
        existing.remove();
        resolve(false);
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googlePlaces = 'register';
    script.onload = () => resolve(true);
    script.onerror = () => {
      googlePlacesScriptPromise = null;
      script.remove();
      resolve(false);
    };
    document.head.appendChild(script);
  }).then(async (loaded) => {
    if (loaded) return true;
    if (retries <= 0) return false;
    await new Promise((r) => setTimeout(r, 700));
    return loadGooglePlacesScript(apiKey, retries - 1);
  });

  return googlePlacesScriptPromise;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function ensurePlacesDropdownStyles() {
  if (typeof document === 'undefined' || googlePlacesStylesInjected) return;
  const style = document.createElement('style');
  style.dataset.googlePlacesStyle = 'register';
  style.textContent = `
    .pac-container {
      z-index: 9999 !important;
      border-radius: 12px;
      border: 1px solid color-mix(in oklab, var(--fg) 8%, transparent);
      box-shadow: 0 10px 30px color-mix(in oklab, var(--fg) 16%, transparent);
    }
  `;
  document.head.appendChild(style);
  googlePlacesStylesInjected = true;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [userType, setUserType] = useState<'client' | 'musician'>('musician');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+569');
  const [instrument, setInstrument] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const [clientRegion, setClientRegion] = useState('');
  const [clientComuna, setClientComuna] = useState('');
  const [clientAddressLine1, setClientAddressLine1] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clientAddressInputEl, setClientAddressInputEl] = useState<HTMLInputElement | null>(null);
  const [placesUnavailable, setPlacesUnavailable] = useState(false);

  const communeOptions = useMemo(
    () =>
      region ? getCommunesForRegion(region).map((c) => ({ value: c.name, label: c.name })) : [],
    [region],
  );
  const clientCommuneOptions = useMemo(
    () =>
      clientRegion ? getCommunesForRegion(clientRegion).map((c) => ({ value: c.name, label: c.name })) : [],
    [clientRegion],
  );

  const canSubmit = () => {
    if (isLoading) return false;
    if (!name || !email || password.length < AUTH_PASSWORD_MIN_LENGTH || !phone) return false;
    if (userType === 'client' && (!clientAddressLine1 || !clientRegion || !clientComuna)) return false;
    if (userType === 'musician' && (!instrument || !region || !comuna)) return false;
    return true;
  };

  const normalizedPhone = useMemo(() => {
    const onlyDigits = phone.replace(/\D/g, '');
    const localNumber = onlyDigits.startsWith('569') ? onlyDigits.slice(3) : onlyDigits;
    return `+569${localNumber.slice(0, 8)}`;
  }, [phone]);

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(password);
  }, [password]);

  const canContinueStep = (currentStep: 1 | 2 | 3) => {
    if (currentStep === 1) return !!userType;
    if (currentStep === 2) return !!name && !!email && password.length >= AUTH_PASSWORD_MIN_LENGTH && !!phone;
    if (currentStep === 3) {
      if (userType === 'client') return !!clientAddressLine1 && !!clientRegion && !!clientComuna;
      return !!instrument && !!region && !!comuna;
    }
    return false;
  };

  const goNext = () => {
    if (!canContinueStep(step)) return;
    if (step < 3) setStep((prev) => (prev + 1) as 1 | 2 | 3);
  };

  const goBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const normalizedEmail = normalizeEmail(email);
      const normalizedName = name.trim();
      const normalizedAddress = clientAddressLine1.trim();

      const createdUser = await register(normalizedName, normalizedEmail, password, {
        userType,
        phone: normalizedPhone,
        ...(userType === 'client'
          ? { addressLine1: normalizedAddress, region: clientRegion, comuna: clientComuna }
          : {}),
        ...(userType === 'musician' ? { instrument, region, comuna } : {}),
      });
      if (createdUser.status === 'verified') {
        router.push('/inicio');
      } else {
        router.push(`/auth/verificar-correo?email=${encodeURIComponent(normalizedEmail)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = 'w-full px-4 py-3.5 rounded-2xl border outline-none transition-all text-base sm:text-[15px]';
  const progress = `${(step / 3) * 100}%`;

  useEffect(() => {
    if (step !== 3 || userType !== 'client' || !clientAddressInputEl) return;
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      '';
    if (!apiKey) return;

    let autocomplete: any;
    let cancelled = false;
    ensurePlacesDropdownStyles();

    void loadGooglePlacesScript(apiKey).then((ready) => {
      if (!ready || cancelled || !clientAddressInputEl) {
        setPlacesUnavailable(true);
        return;
      }
      const googleMaps = (window as Window & { google?: any }).google?.maps;
      if (!googleMaps?.places?.Autocomplete) {
        setPlacesUnavailable(true);
        return;
      }
      setPlacesUnavailable(false);

      autocomplete = new googleMaps.places.Autocomplete(clientAddressInputEl, {
        componentRestrictions: { country: 'cl' },
        fields: ['address_components', 'formatted_address', 'name'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace?.();
        if (!place) return;

        const components: Array<{ long_name: string; short_name: string; types: string[] }> =
          place.address_components || [];

        const exactAddress = place.formatted_address || place.name || '';
        if (exactAddress) setClientAddressLine1(exactAddress);

        const adminLevel1 = components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name || '';
        const locality =
          components.find((c) => c.types.includes('locality'))?.long_name ||
          components.find((c) => c.types.includes('administrative_area_level_3'))?.long_name ||
          components.find((c) => c.types.includes('sublocality'))?.long_name ||
          '';

        if (adminLevel1) {
          const regionMatch = LOCATION_REGIONS.find((r) => {
            const regionName = normalizeText(r.name);
            const target = normalizeText(adminLevel1);
            return regionName.includes(target) || target.includes(regionName);
          });
          if (regionMatch) {
            setClientRegion(regionMatch.id);
            if (locality) {
              const communeMatch = getCommunesForRegion(regionMatch.id).find((c) => {
                const communeName = normalizeText(c.name);
                const target = normalizeText(locality);
                return communeName.includes(target) || target.includes(communeName);
              });
              if (communeMatch) setClientComuna(communeMatch.name);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      const googleMaps = (window as Window & { google?: any }).google?.maps;
      if (autocomplete && googleMaps?.event?.clearInstanceListeners) {
        googleMaps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [step, userType, clientAddressInputEl]);

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row lg:gap-0">
      {/* Columna formulario — mobile-first; en desktop más ancho y padding generoso */}
      <div className="w-full lg:w-[min(56%,42rem)] lg:shrink-0 flex flex-col bg-[var(--surface)] min-h-[100dvh] lg:min-h-screen">
        <header className="shrink-0 px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-14 pt-[max(1rem,env(safe-area-inset-top))] lg:pt-8 pb-3 lg:pb-5 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)] touch-manipulation"
            style={{ color: 'var(--fg)' }}
          >
            <IconArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Volver</span>
          </Link>
          <BrandLogo appId="simpleserenatas" className="min-w-0 [&>span:last-child]:truncate [&>span:last-child]:text-base [&>span:last-child]:font-bold" />
          <div className="w-14 sm:w-20 shrink-0" aria-hidden />
        </header>

        <div className="flex-1 px-4 sm:px-8 lg:px-10 xl:px-14 2xl:px-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-12 flex flex-col justify-center lg:justify-start max-w-xl lg:max-w-2xl xl:max-w-[36.5rem] 2xl:max-w-[40rem] mx-auto w-full lg:pt-2">
          <div className="mb-7 sm:mb-8 lg:mb-10">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: s === step ? 28 : 16,
                      background: s <= step ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                ))}
                <p className="text-xs font-medium uppercase tracking-wide ml-1" style={{ color: 'var(--fg-muted)' }}>
                  Paso {step} de 3
                </p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: progress, background: 'var(--accent)' }} />
              </div>
            </div>
            <h1 className="type-page-title leading-tight lg:text-[1.75rem] xl:text-[1.875rem]" style={{ color: 'var(--fg)' }}>
              Crea tu cuenta
            </h1>
          </div>

          {error && <AuthFeedback message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-7">
            {step === 1 && (
              <div>
                <p className="block text-sm font-medium mb-2.5" style={{ color: 'var(--fg)' }}>
                  ¿Cómo vas a usar SimpleSerenatas?
                </p>
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5 xl:gap-6 lg:items-stretch">
                  <button
                    type="button"
                    onClick={() => setUserType('client')}
                    className={`flex-1 lg:min-h-[11.5rem] rounded-3xl border p-5 sm:p-6 lg:p-7 text-left transition-all touch-manipulation active:scale-[0.99] ${
                      userType === 'client' ? 'shadow-md' : ''
                    }`}
                    style={{
                      borderColor: userType === 'client' ? 'color-mix(in oklab, var(--accent) 35%, transparent)' : 'var(--border)',
                      background: userType === 'client' ? 'color-mix(in oklab, var(--accent) 5%, var(--surface))' : 'var(--surface)',
                    }}
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: userType === 'client' ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'var(--bg-subtle)' }}>
                      <IconHeart size={22} style={{ color: userType === 'client' ? 'var(--accent)' : 'var(--fg-muted)' }} stroke={1.8} />
                    </div>
                    <div className="font-semibold text-base mb-1" style={{ color: 'var(--fg)' }}>Soy cliente</div>
                    <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--fg-secondary)' }}>
                      Solicita serenatas para regalos y celebraciones.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('musician')}
                    className={`flex-1 lg:min-h-[11.5rem] rounded-3xl border p-5 sm:p-6 lg:p-7 text-left transition-all touch-manipulation active:scale-[0.99] ${
                      userType === 'musician' ? 'shadow-md' : ''
                    }`}
                    style={{
                      borderColor: userType === 'musician' ? 'color-mix(in oklab, var(--accent) 35%, transparent)' : 'var(--border)',
                      background: userType === 'musician' ? 'color-mix(in oklab, var(--accent) 5%, var(--surface))' : 'var(--surface)',
                    }}
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: userType === 'musician' ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'var(--bg-subtle)' }}>
                      <IconMusic size={22} style={{ color: userType === 'musician' ? 'var(--accent)' : 'var(--fg-muted)' }} stroke={1.8} />
                    </div>
                    <div className="font-semibold text-base mb-1" style={{ color: 'var(--fg)' }}>Soy músico</div>
                    <p className="text-xs sm:text-sm leading-snug" style={{ color: 'var(--fg-secondary)' }}>
                      Recibe invitaciones para tocar en serenatas.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                    Nombre completo
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="María González"
                    className={inputBase}
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trimStart())}
                    placeholder="tu@email.com"
                    className={inputBase}
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputBase} pr-12`}
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                      autoComplete="new-password"
                      required
                    />
                    {password.length > 0 && (
                      <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                        Seguridad: {passwordStrength === 'low' ? 'baja' : passwordStrength === 'medium' ? 'media' : passwordStrength === 'high' ? 'alta' : 'baja'}.
                        Requisito mínimo: {AUTH_PASSWORD_MIN_LENGTH} caracteres.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-subtle)] touch-manipulation"
                      style={{ color: 'var(--fg-muted)' }}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                    WhatsApp / teléfono
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith('+569')) value = '+569' + value.replace(/[^0-9]/g, '');
                      const digits = value.slice(4).replace(/\D/g, '').slice(0, 8);
                      setPhone('+569' + digits);
                    }}
                    placeholder="+56 9 1234 5678"
                    className={inputBase}
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                    autoComplete="tel"
                    required
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                {userType === 'musician' ? (
                  <div className="space-y-5">
                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                      Completa tu perfil musical
                    </p>
                    <ModernSelect
                      value={instrument}
                      onChange={setInstrument}
                      options={instruments.map((i) => ({ value: i, label: i }))}
                      placeholder="Instrumento principal"
                    />
                    <ModernSelect
                      value={region}
                      onChange={(v: string) => {
                        setRegion(v);
                        setComuna('');
                      }}
                      options={LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }))}
                      placeholder="Región"
                    />
                    {region && (
                      <ModernSelect
                        value={comuna}
                        onChange={setComuna}
                        options={communeOptions}
                        placeholder="Comuna"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                        Dirección exacta
                      </label>
                      <input
                        ref={setClientAddressInputEl}
                        value={clientAddressLine1}
                        onChange={(e) => setClientAddressLine1(e.target.value)}
                        placeholder="Ej: Av. Apoquindo 4501"
                        className={inputBase}
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                        required
                      />
                      {placesUnavailable && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                          Si no ves sugerencias, escribe tu dirección manualmente y selecciona región/comuna.
                        </p>
                      )}
                    </div>
                    <ModernSelect
                      value={clientRegion}
                      onChange={(v: string) => {
                        setClientRegion(v);
                        setClientComuna('');
                      }}
                      options={LOCATION_REGIONS.map((r) => ({ value: r.id, label: r.name }))}
                      placeholder="Región"
                    />
                    {clientRegion && (
                      <ModernSelect
                        value={clientComuna}
                        onChange={setClientComuna}
                        options={clientCommuneOptions}
                        placeholder="Comuna"
                      />
                    )}
                    {clientAddressLine1 && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clientAddressLine1} ${clientComuna || ''} ${clientRegion || ''}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm"
                        style={{ color: 'var(--accent)' }}
                      >
                        Ver en Google Maps
                        <IconExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}

                {userType === 'musician' && (
                  <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}>
                    <div className="flex items-start gap-2">
                      <IconCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span>
                        Activa tu perfil de coordinador desde tu panel cuando quieras.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-3 pt-4 lg:pt-6 xl:pt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 rounded-2xl py-3.5 font-semibold border transition-all hover:bg-[var(--bg-subtle)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                >
                  Atrás
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinueStep(step)}
                  className="flex-1 rounded-2xl py-3.5 font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 touch-manipulation shadow-sm"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit()}
                  className="flex-1 rounded-2xl py-3.5 font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 touch-manipulation shadow-sm"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/auth/login"
              className="serenatas-interactive font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              Iniciar sesión
            </Link>
          </p>

        </div>
      </div>

      {/* Panel visual — oculto en móvil; en desktop flex-1 para balancear ancho con la columna del formulario */}
      <div
        className="hidden lg:flex lg:flex-1 lg:min-w-0 items-center justify-center relative overflow-hidden min-h-screen px-6 xl:px-10 2xl:px-14"
        style={{ background: 'linear-gradient(145deg, var(--surface) 0%, var(--bg-subtle) 100%)' }}
      >
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--surface)' }} />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--surface)' }} />
        </div>

        <div className="relative z-10 w-full max-w-md xl:max-w-lg 2xl:max-w-xl py-10 xl:py-14">
          <div className="rounded-[2rem] border p-8 xl:p-10 2xl:p-12" style={{ borderColor: 'color-mix(in oklab, var(--fg) 6%, transparent)', background: 'color-mix(in oklab, var(--surface) 72%, transparent)', backdropFilter: 'blur(8px)' }}>
            <BrandLogo appId="simpleserenatas" showWordmark={false} size="lg" className="mb-6 xl:mb-8" />
            <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold mb-3 xl:mb-5 leading-tight" style={{ color: 'var(--fg)' }}>
              Todo listo en menos de un minuto
            </h2>
            <p className="text-base xl:text-lg leading-relaxed mb-6 xl:mb-8" style={{ color: 'var(--fg-secondary)' }}>
              Te registras y comienzas a usar la plataforma al instante.
            </p>
            <div className="flex items-center gap-2.5 xl:gap-3 flex-wrap">
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'color-mix(in oklab, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>
                Registro guiado
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}>
                3 pasos
              </span>
              <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}>
                Inicio inmediato
              </span>
            </div>
            <div className="mt-6 xl:mt-8 pt-6 xl:pt-7 border-t" style={{ borderColor: 'color-mix(in oklab, var(--fg) 8%, transparent)' }}>
              <p className="text-sm xl:text-[0.9375rem] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                Luego puedes completar más detalles desde tu panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

