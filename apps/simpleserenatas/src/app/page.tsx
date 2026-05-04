'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import {
  IconConfettiFilled,
  IconMapPin,
  IconUsers,
  IconCalendar,
  IconArrowRight,
  IconRadio,
  IconCheck,
  IconStar,
  IconTrophy,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { BrandLogo } from '@simple/ui';

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 420px)' }}>
      {/* Navigation - Mobile */}
      <nav className="flex lg:hidden items-center justify-between px-4 py-3 border-b bg-[var(--surface)]/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="group shrink-0">
          <BrandLogo appId="simpleserenatas" />
        </Link>
        <div className="flex items-center gap-2">
          {mounted && (
            <button
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
            className="serenatas-interactive px-4 py-2 rounded-xl font-medium text-sm transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Navigation - Desktop */}
      <nav className="hidden lg:flex items-center justify-between px-8 py-4 border-b bg-[var(--surface)]/90 backdrop-blur-sm" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="group shrink-0">
          <BrandLogo appId="simpleserenatas" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="serenatas-interactive px-5 py-2.5 rounded-xl font-medium transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/registro"
            className="serenatas-interactive px-5 py-2.5 rounded-xl font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
          >
            Crear cuenta
          </Link>
          {mounted && (
            <button
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

      {/* Hero Section */}
      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg, var(--surface) 0%, var(--bg-subtle) 100%)' }}
      >
        <div className="absolute inset-0 opacity-80">
          <div className="absolute top-16 left-8 w-72 h-72 rounded-full blur-3xl" style={{ background: 'var(--surface)' }} />
          <div className="absolute bottom-10 right-8 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--surface)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left mb-12 lg:mb-0">
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-5" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                Registro y operación en una sola app
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05] mb-6" style={{ color: 'var(--fg)' }}>
                Organiza tus serenatas
                <br />
                sin fricción
              </h1>
              <p className="text-lg lg:text-xl mb-8 max-w-xl mx-auto lg:mx-0" style={{ color: 'var(--fg-secondary)' }}>
                Gestiona grupos, rutas, solicitudes y pagos con una experiencia simple, rápida y moderna.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/registro"
                  className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all hover:opacity-90"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Comenzar Gratis
                  <IconArrowRight size={20} />
                </Link>
                <Link
                  href="/auth/login"
                  className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold border transition-all"
                  style={{ color: 'var(--fg)', borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  Iniciar sesión
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                <div className="flex items-center gap-2">
                  <IconCheck size={16} />
                  <span>Gratis para siempre</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck size={16} />
                  <span>Sin comisiones</span>
                </div>
              </div>
            </div>

            {/* Right: Visual/App Preview */}
            <div className="hidden lg:block relative">
              <div
                className="relative rounded-[2rem] p-5 shadow-sm"
                style={{ background: 'color-mix(in srgb, var(--surface) 78%, transparent)', backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}
              >
                {/* Mock App Interface */}
                <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <IconConfettiFilled size={20} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--fg)' }}>Bienvenido de vuelta</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Tienes 3 serenatas hoy</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <MockSerenataCard time="10:00" location="Las Condes" type="Cumpleaños" />
                    <MockSerenataCard time="14:30" location="Providencia" type="Aniversario" />
                    <MockSerenataCard time="19:00" location="Ñuñoa" type="Sorpresa" />
                  </div>

                  <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ganancias estimadas</span>
                      <span className="font-bold" style={{ color: 'var(--success)' }}>$180.000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', boxShadow: '0 16px 28px color-mix(in oklab, var(--fg) 18%, transparent)' }}
              >
                <div className="text-center">
                  <IconTrophy size={24} className="mx-auto mb-1" />
                  <p className="text-xs font-medium">Top Rated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--fg)' }}>
              Todo lo que necesitas para triunfar
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--fg-secondary)' }}>
              Herramientas claras para operar mejor cada serenata.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCardLarge
              icon={IconUsers}
              title="Grupos Inteligentes"
              description="Forma equipos automáticamente según disponibilidad e instrumentos"
              color="var(--accent)"
            />
            <FeatureCardLarge
              icon={IconMapPin}
              title="Rutas Optimizadas"
              description="Minimiza tiempos de traslado con nuestra app de navegación"
              color="var(--success)"
            />
            <FeatureCardLarge
              icon={IconCalendar}
              title="Agenda Centralizada"
              description="Gestiona todas tus serenatas en un solo lugar"
              color="var(--info)"
            />
            <FeatureCardLarge
              icon={IconRadio}
              title="Modo Urgencia"
              description="Recibe notificaciones instantáneas de serenatas de último minuto"
              color="var(--warning)"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 lg:px-8" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
              ¿Cómo funciona?
            </h2>
            <p className="text-lg" style={{ color: 'var(--fg-secondary)' }}>
              Empieza a trabajar en 3 simples pasos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Crea tu perfil"
              description="Regístrate y completa tu información como músico de mariachi"
            />
            <StepCard
              number="2"
              title="Marca tu disponibilidad"
              description="Indica cuándo estás disponible para recibir serenatas"
            />
            <StepCard
              number="3"
              title="Recibe solicitudes"
              description="Empieza a recibir y gestionar serenatas en tu zona"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 lg:px-8" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-8 lg:p-12 text-center"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <h2 className="text-2xl lg:text-3xl font-bold mb-12">
              Únete a la comunidad de músicos más grande de Chile
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <StatItem number="500+" label="Músicos activos" />
              <StatItem number="2,000+" label="Serenatas mensuales" />
              <StatItem number="15%" label="Más ingresos promedio" />
              <StatItem number="4.9" label="Rating de app" icon={<IconStar size={20} className="inline text-yellow-300" />} />
            </div>
          </div>
        </div>
      </section>

      {/* Device Support */}
      <section className="py-20 px-6 lg:px-8" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6" style={{ color: 'var(--fg)' }}>
                Disponible en todos tus dispositivos
              </h2>
              <p className="text-lg mb-8" style={{ color: 'var(--fg-secondary)' }}>
                Accede a SimpleSerenatas desde tu celular, tablet o computadora. La experiencia está optimizada para cada pantalla.
              </p>
              <div className="flex flex-wrap gap-4">
                <div
                  className="flex items-center gap-3 px-6 py-4 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <IconDeviceMobile size={24} style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>Mobile First</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>iOS & Android</p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 px-6 py-4 rounded-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <IconDeviceDesktop size={24} style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>Desktop</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Mac, Windows, Linux</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div
                className="rounded-3xl p-8 shadow-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <IconCheck size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--fg)' }}>Responsive Design</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Se adapta a cualquier pantalla</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <IconCheck size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--fg)' }}>PWA Ready</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Instala como app nativa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--accent-subtle)' }}
                    >
                      <IconCheck size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--fg)' }}>Sync en tiempo real</p>
                      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Datos sincronizados entre dispositivos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: 'var(--fg)' }}>
            ¿Listo para potenciar tu carrera musical?
          </h2>
          <p className="text-xl mb-10" style={{ color: 'var(--fg-secondary)' }}>
            Únete gratis a SimpleSerenatas y empieza a recibir más serenatas hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/registro"
              className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              Crear cuenta gratis
              <IconArrowRight size={20} />
            </Link>
            <Link
              href="/auth/login"
              className="serenatas-interactive inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all border-2"
              style={{ color: 'var(--fg)', borderColor: 'var(--border)' }}
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
            Sin costo de registro • Sin comisiones • Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-8 border-t" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <BrandLogo appId="simpleserenatas" />
            <p className="text-sm text-center lg:text-right" style={{ color: 'var(--fg-muted)' }}>
              © 2026 SimpleSerenatas. Sistema operativo para músicos de mariachis.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCardLarge({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="p-6 rounded-2xl transition-all hover:shadow-lg"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${color}15` }}
      >
        <Icon size={28} style={{ color }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
        {description}
      </p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
      >
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--fg-secondary)' }}>{description}</p>
    </div>
  );
}

function StatItem({ number, label, icon }: { number: string; label: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-3xl lg:text-4xl font-bold mb-1">
        {number} {icon}
      </p>
      <p className="text-sm" style={{ color: 'color-mix(in oklab, var(--accent-contrast) 70%, transparent)' }}>{label}</p>
    </div>
  );
}

function MockSerenataCard({ time, location, type }: { time: string; location: string; type: string }) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--accent-subtle)' }}
      >
        <IconConfettiFilled size={20} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
          {type}
        </p>
        <p className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>
          {location}
        </p>
      </div>
      <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
        {time}
      </span>
    </div>
  );
}
