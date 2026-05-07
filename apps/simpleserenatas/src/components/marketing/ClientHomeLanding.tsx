'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowRight,
  IconCalendarEvent,
  IconCheck,
  IconHeart,
  IconMapPin,
  IconMoon,
  IconSun,
  IconShieldCheck,
} from '@tabler/icons-react';
import { BrandLogo } from '@simple/ui';
import { MARIACHIS_COMUNAS } from '@/lib/mariachis-comunas';

const REGISTRO_CLIENTE = `/auth/registro?tipo=cliente&next=${encodeURIComponent('/solicitar')}`;

export function ClientHomeLanding() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [comunaPref, setComunaPref] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const comunaOptions = useMemo(
    () => [
      { value: '', label: 'Elige tu comuna (opcional)' },
      ...MARIACHIS_COMUNAS.map((c) => ({ value: c.pathSegment, label: c.comunName })),
      { value: 'otra', label: 'Otra comuna de la RM' },
    ],
    [],
  );

  const solicitarNow = () => {
    const q = comunaPref && comunaPref !== 'otra' ? `&pref_comuna=${encodeURIComponent(comunaPref)}` : '';
    router.push(`${REGISTRO_CLIENTE}${q}`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 480px)' }}>
      <nav className="flex lg:hidden items-center justify-between px-4 py-3 border-b bg-[var(--surface)]/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="group shrink-0">
          <BrandLogo appId="simpleserenatas" />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/profesionales" className="text-xs font-medium px-2 py-1.5 rounded-lg max-w-[5.5rem] truncate sm:max-w-none" style={{ color: 'var(--fg-secondary)' }}>
            Profesionales
          </Link>
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
              aria-label="Cambiar tema"
              style={{ color: 'var(--fg-secondary)' }}
            >
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          )}
          <Link
            href="/auth/login"
            className="serenatas-interactive px-3 py-2 rounded-xl font-medium text-sm transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            Entrar
          </Link>
          <Link
            href={REGISTRO_CLIENTE}
            className="serenatas-interactive px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Solicitar
          </Link>
        </div>
      </nav>

      <nav className="hidden lg:flex items-center justify-between px-8 py-4 border-b bg-[var(--surface)]/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="group shrink-0">
          <BrandLogo appId="simpleserenatas" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/profesionales" className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--fg-secondary)' }}>
            Soy músico o coordinador
          </Link>
          <Link href="/auth/login" className="serenatas-interactive px-5 py-2.5 rounded-xl font-medium transition-colors" style={{ color: 'var(--fg-secondary)' }}>
            Iniciar sesión
          </Link>
          <Link
            href={REGISTRO_CLIENTE}
            className="serenatas-interactive px-5 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Solicitar ahora
          </Link>
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
              aria-label="Cambiar tema"
              style={{ color: 'var(--fg-secondary)' }}
            >
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          )}
        </div>
      </nav>

      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg, var(--surface) 0%, var(--bg-subtle) 100%)' }}
      >
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="absolute top-20 right-12 w-80 h-80 rounded-full blur-3xl" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }} />
          <div className="absolute bottom-8 left-8 w-72 h-72 rounded-full blur-3xl" style={{ background: 'var(--surface)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-20">
          <div className="lg:grid lg:grid-cols-[1fr_min(26rem)] gap-14 items-start">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-5" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                <IconMapPin size={14} aria-hidden /> Santiago · Región Metropolitana
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-bold leading-[1.08] mb-6 tracking-tight" style={{ color: 'var(--fg)' }}>
                Contrata mariachis a domicilio en Santiago
              </h1>
              <p className="text-lg lg:text-xl mb-6 max-w-2xl" style={{ color: 'var(--fg-secondary)' }}>
                Serenatas para cumpleaños, aniversarios y sorpresas. Coordinación con llegada pactada y proceso claro antes del día{' '}
                <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                  desde $50.000
                </span>
                {' — '}
                el precio final lo confirma el coordinador según duración y desplazamiento.
              </p>

              <ul className="flex flex-wrap gap-x-8 gap-y-3 mb-10 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                <li className="inline-flex items-center gap-2">
                  <IconCheck size={18} style={{ color: 'var(--accent)' }} aria-hidden /> Solicitud guiada después del registro
                </li>
                <li className="inline-flex items-center gap-2">
                  <IconShieldCheck size={18} style={{ color: 'var(--accent)' }} aria-hidden /> Coordinadores que operan por la app
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={REGISTRO_CLIENTE}
                  className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all hover:opacity-90 text-center"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Solicitar ahora
                  <IconArrowRight size={20} aria-hidden />
                </Link>
                <Link
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold border transition-colors"
                  style={{ color: 'var(--fg)', borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  Cómo funciona
                </Link>
              </div>
            </div>

            <div
              className="mt-12 lg:mt-0 rounded-[1.75rem] p-6 lg:p-7 border shadow-sm"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
                Empieza en minutos
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
                Creas cuenta como cliente y luego completas fecha, lugar y mensaje para tu serenata.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }} htmlFor="pref-comuna">
                    ¿En qué comuna será?
                  </label>
                  <select
                    id="pref-comuna"
                    value={comunaPref}
                    onChange={(e) => setComunaPref(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-base bg-[var(--surface)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}
                  >
                    {comunaOptions.map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={solicitarNow}
                  className="w-full serenatas-interactive inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Continuar al registro
                  <IconArrowRight size={18} aria-hidden />
                </button>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                  Si ya tienes cuenta,{' '}
                  <Link href="/auth/login" className="font-medium underline underline-offset-2" style={{ color: 'var(--accent)' }}>
                    inicia sesión
                  </Link>{' '}
                  y dirígete a solicitar desde tu panel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-16 lg:py-20 px-6 lg:px-8 scroll-mt-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--fg)' }}>
            Cómo funciona para ti
          </h2>
          <p className="text-center max-w-xl mx-auto mb-12" style={{ color: 'var(--fg-secondary)' }}>
            Tres pasos simples después de registrarte. El detalle musical y la hora exacta los alineamos con tu coordinador.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <StepMinimal
              icon={IconHeart}
              title="1 · Cuenta y ubicación"
              body="Te registras como cliente e indicamos dónde recibirás al grupo para evitar improvisaciones."
            />
            <StepMinimal
              icon={IconCalendarEvent}
              title="2 · Solicitud"
              body="Completas la solicitud (fecha tentativa, comuna y ocasión) para que un coordinador te responda."
            />
            <StepMinimal
              icon={IconMapPin}
              title="3 · Confirmación"
              body="Aclaran repertorio, duración y condiciones antes del día — sin sorpresas de último minuto."
            />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 px-6 lg:px-8 border-t" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--fg)' }}>
            Lo que dicen quienes ya usaron el flujo
          </h2>
          <p className="text-sm text-center mb-10 max-w-2xl mx-auto" style={{ color: 'var(--fg-muted)' }}>
            Textos de ejemplo para maquetar la sección. Sustituye por al menos tres testimonios reales antes de invertir en anuncios pagados.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard quote="“Quedó clarísimo cuándo llegaban y qué iban a tocar. La sorpresa salió redonda.”" name="Cliente, RM" />
            <TestimonialCard quote="“No tuve que coordinar por tres chats distintos; todo quedó en un solo lugar.”" name="Cliente, cumpleaños" />
            <TestimonialCard quote="“Me ayudaron a ajustar el volumen porque vivo en edificio con vecinos cerca.”" name="Cliente, Providencia" />
          </div>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-8" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--fg)' }}>
            Mariachis por comuna
          </h2>
          <p className="text-center mb-8 text-sm max-w-xl mx-auto" style={{ color: 'var(--fg-secondary)' }}>
            Páginas con información local y metadatos para búsquedas del tipo “mariachis en Maipú”.
          </p>
          <ul className="flex flex-wrap justify-center gap-3">
            {MARIACHIS_COMUNAS.map((c) => (
              <li key={c.pathSegment}>
                <Link
                  href={`/mariachis-${c.pathSegment}`}
                  className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium border transition-colors hover:opacity-90"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                >
                  {c.comunName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
            ¿Lista la fecha o todavía estás armando la sorpresa?
          </h2>
          <p className="mb-8" style={{ color: 'var(--fg-secondary)' }}>
            Puedes dejar la solicitud iniciada; el coordinador te confirma disponibilidad y precio final.
          </p>
          <Link
            href={REGISTRO_CLIENTE}
            className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Solicitar ahora
            <IconArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="py-12 px-6 lg:px-8 border-t" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <BrandLogo appId="simpleserenatas" />
          <div className="flex flex-wrap justify-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
            <Link href="/profesionales" className="hover:underline">
              Profesionales
            </Link>
            {MARIACHIS_COMUNAS.slice(0, 3).map((c) => (
              <Link key={c.pathSegment} href={`/mariachis-${c.pathSegment}`} className="hover:underline">
                Mariachis {c.comunName}
              </Link>
            ))}
          </div>
          <p className="text-sm text-center sm:text-right" style={{ color: 'var(--fg-muted)' }}>
            © 2026 SimpleSerenatas
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepMinimal({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl p-6 border text-left" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)' }}>
        <Icon size={22} style={{ color: 'var(--accent)' }} aria-hidden />
      </div>
      <h3 className="font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
        {body}
      </p>
    </div>
  );
}

function TestimonialCard({ quote, name }: { quote: string; name: string }) {
  return (
    <figure className="rounded-2xl p-6 border h-full flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <blockquote className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--fg-secondary)' }}>
        {quote}
      </blockquote>
      <figcaption className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
        {name}
      </figcaption>
    </figure>
  );
}
