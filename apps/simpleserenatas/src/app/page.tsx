'use client';

import Link from 'next/link';
import { 
  IconMusic, 
  IconMapPin, 
  IconUsers, 
  IconCalendar,
  IconArrowRight,
  IconRadio
} from '@tabler/icons-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700">
      {/* Hero */}
      <div className="px-6 pt-16 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <IconMusic size={24} className="text-rose-500" />
          </div>
          <span className="text-white text-xl font-bold">SimpleSerenatas</span>
        </div>

        <h1 className="text-4xl font-bold text-white leading-tight mb-4">
          Organiza tus serenatas como un profesional
        </h1>
        <p className="text-rose-100 text-lg mb-8">
          El sistema operativo para músicos de mariachis. Gestiona grupos, optimiza rutas y multiplica tus ganancias.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full bg-white text-rose-600 rounded-xl py-4 font-semibold text-center hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
          >
            Iniciar Sesión
            <IconArrowRight size={20} />
          </Link>
          <Link
            href="/auth/registro"
            className="w-full bg-rose-700 text-white rounded-xl py-4 font-semibold text-center hover:bg-rose-800 transition-colors"
          >
            Crear Cuenta
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-8 bg-white rounded-t-3xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6 text-center">
          Todo lo que necesitas
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <FeatureCard
            icon={IconUsers}
            title="Grupos"
            description="Forma equipos rápidamente"
          />
          <FeatureCard
            icon={IconMapPin}
            title="Rutas"
            description="Optimiza tu recorrido"
          />
          <FeatureCard
            icon={IconCalendar}
            title="Agenda"
            description="Organiza tus serenatas"
          />
          <FeatureCard
            icon={IconRadio}
            title="Urgencias"
            description="Modo disponible ahora"
          />
        </div>

        {/* Stats */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-2xl">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-zinc-400">Músicos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">2,000+</p>
              <p className="text-xs text-zinc-400">Serenatas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">15%</p>
              <p className="text-xs text-zinc-400">Más ingresos</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm mb-4">
            ¿Eres músico de mariachi? Únete a la plataforma
          </p>
          <Link
            href="/auth/registro"
            className="inline-flex items-center gap-2 text-rose-600 font-semibold hover:text-rose-700"
          >
            Registrarme gratis
            <IconArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 bg-zinc-50 rounded-xl">
      <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center mb-3">
        <Icon size={20} className="text-rose-600" />
      </div>
      <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}
