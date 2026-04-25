'use client';

import Link from 'next/link';
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
} from '@tabler/icons-react';
import { Logo } from '@simple/ui';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Desktop */}
      <nav className="hidden lg:flex items-center justify-between px-8 py-4 border-b sticky top-0 z-50 bg-white/80 backdrop-blur-md" style={{ borderColor: 'var(--border)' }}>
        <Logo brand="serenatas" href="/" />
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="px-5 py-2.5 rounded-xl font-medium transition-colors"
            style={{ color: 'var(--fg-secondary)' }}
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/auth/registro"
            className="px-5 py-2.5 rounded-xl font-medium text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Crear Cuenta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #be123c 100%)' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              {/* Mobile Logo */}
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-8 lg:hidden">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <IconConfettiFilled size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <span className="text-white text-xl font-bold">SimpleSerenatas</span>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Organiza tus serenatas como un{' '}
                <span className="text-white/90">profesional</span>
              </h1>
              <p className="text-lg lg:text-xl text-white/90 mb-8 max-w-xl mx-auto lg:mx-0">
                El sistema operativo para músicos de mariachis. Gestiona grupos, optimiza rutas y multiplica tus ganancias.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/registro"
                  className="inline-flex items-center justify-center gap-2 bg-white px-8 py-4 rounded-xl font-semibold transition-all hover:bg-white/90 hover:shadow-lg"
                  style={{ color: 'var(--accent)' }}
                >
                  Comenzar Gratis
                  <IconArrowRight size={20} />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white border-2 border-white/30 transition-all hover:bg-white/10"
                >
                  Iniciar Sesión
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-white/80 text-sm">
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
                className="relative rounded-3xl p-6 shadow-2xl"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {/* Mock App Interface */}
                <div className="bg-white rounded-2xl p-6 shadow-xl">
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
                className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                <div className="text-center">
                  <IconTrophy size={24} className="mx-auto mb-1" />
                  <p className="text-xs font-medium">Top Rated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--fg)' }}>
              Todo lo que necesitas para triunfar
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--fg-secondary)' }}>
              Herramientas profesionales diseñadas específicamente para músicos de mariachis
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
              color="#22c55e"
            />
            <FeatureCardLarge
              icon={IconCalendar}
              title="Agenda Centralizada"
              description="Gestiona todas tus serenatas en un solo lugar"
              color="#3b82f6"
            />
            <FeatureCardLarge
              icon={IconRadio}
              title="Modo Urgencia"
              description="Recibe notificaciones instantáneas de serenatas de último minuto"
              color="#f59e0b"
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
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-8 lg:p-12 text-center"
            style={{ background: 'var(--fg)', color: 'white' }}
          >
            <h2 className="text-2xl lg:text-3xl font-bold mb-12">
              Únete a la comunidad de músicos más grande de Chile
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <StatItem number="500+" label="Músicos activos" />
              <StatItem number="2,000+" label="Serenatas mensuales" />
              <StatItem number="15%" label="Más ingresos promedio" />
              <StatItem number="4.9" label="Rating de app" icon={<IconStar size={20} className="inline text-yellow-400" />} />
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
      <section className="py-20 px-6 lg:px-8">
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
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Crear cuenta gratis
              <IconArrowRight size={20} />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all border-2"
              style={{ color: 'var(--fg)', borderColor: 'var(--border)' }}
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
            Sin costos de registro • Sin comisiones • Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-8 border-t" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent)' }}
              >
                <IconConfettiFilled size={20} style={{ color: 'var(--accent-contrast)' }} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                Simple<span style={{ color: 'var(--accent)' }}>Serenatas</span>
              </span>
            </div>
            <p className="text-sm text-center lg:text-right" style={{ color: 'var(--fg-muted)' }}>
              © 2024 SimpleSerenatas. Sistema operativo para músicos de mariachis.
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
      <p className="text-sm text-white/70">{label}</p>
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
