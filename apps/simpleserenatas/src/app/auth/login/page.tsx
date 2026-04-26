'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconConfettiFilled, IconEye, IconEyeOff, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleLoginButton } from '@simple/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      router.push('/inicio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form (Mobile & Desktop) */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl transition-colors hover:bg-zinc-100"
            style={{ color: 'var(--fg)' }}
          >
            <IconArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <IconConfettiFilled size={16} style={{ color: '#E11D48' }} />
            </div>
            <span className="font-bold" style={{ color: 'var(--fg)' }}>SimpleSerenatas</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 sm:px-12 lg:px-16 py-8 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>
              Bienvenido de vuelta
            </h1>
            <p style={{ color: 'var(--fg-secondary)' }}>
              Inicia sesión para continuar
            </p>
          </div>

          {error && (
            <div
              className="mb-6 rounded-xl p-4 text-sm"
              style={{ background: 'var(--error)', color: 'white' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--fg)',
                }}
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border outline-none transition-all pr-12"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--fg)',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border outline-none"
                  style={{ borderColor: 'var(--border)', accentColor: 'var(--accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>Recordarme</span>
              </label>
              <Link
                href="/auth/recuperar"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3.5 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white" style={{ color: 'var(--fg-muted)' }}>O continúa con</span>
              </div>
            </div>

            <GoogleLoginButton
              onError={(message) => setError(message)}
            >
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 rounded-xl py-3 font-medium transition-colors hover:opacity-80 border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </GoogleLoginButton>
          </div>

          {/* Register Link */}
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
            ¿No tienes una cuenta?{' '}
            <Link
              href="/auth/registro"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Visual (Desktop Only) */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-7/12 items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #be123c 100%)' }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg px-12">
          {/* Logo Large */}
          <div className="mb-12">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <IconConfettiFilled size={40} style={{ color: '#E11D48' }} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Sistema operativo para músicos de mariachi
            </h2>
            <p className="text-white/80 text-lg">
              Gestiona grupos, optimiza rutas y multiplica tus ganancias con la plataforma más completa del mercado.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            <FeatureItem text="Grupos inteligentes automáticos" />
            <FeatureItem text="Rutas optimizadas con GPS" />
            <FeatureItem text="Agenda centralizada" />
            <FeatureItem text="Modo urgencia para serenatas de último minuto" />
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-white/70 text-sm">Músicos activos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">2,000+</p>
                <p className="text-white/70 text-sm">Serenatas mensuales</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">4.9</p>
                <p className="text-white/70 text-sm">Rating de app</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-white">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        <IconCheck size={14} className="text-white" />
      </div>
      <span className="text-white/90">{text}</span>
    </div>
  );
}
