'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconConfettiFilled, IconEye, IconEyeOff, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

const instruments = [
  { id: 'trumpet', name: 'Trompeta', emoji: '🎺' },
  { id: 'voice', name: 'Voz', emoji: '🎤' },
  { id: 'guitar', name: 'Guitarra', emoji: '🎸' },
  { id: 'vihuela', name: 'Vihuela', emoji: '🎻' },
  { id: 'guitarron', name: 'Guitarrón', emoji: '🎸' },
  { id: 'violin', name: 'Violín', emoji: '🎻' },
];

const comunas = [
  'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'La Reina', 
  'Santiago', 'Maipú', 'La Florida'
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [instrument, setInstrument] = useState('');
  const [comuna, setComuna] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await register(name, email, password);
      // Registration successful - redirect to onboarding to create musician profile
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (isLoading) return false;
    if (step === 1) return name && email && password && phone;
    if (step === 2) return instrument;
    if (step === 3) return comuna;
    return false;
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
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <IconConfettiFilled size={16} style={{ color: '#E11D48' }} />
            </div>
            <span className="font-bold" style={{ color: 'var(--fg)' }}>SimpleSerenatas</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Progress */}
        <div className="px-6 sm:px-12 lg:px-16 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>Paso {step} de 3</span>
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 sm:px-12 lg:px-16 pb-8 max-w-md mx-auto w-full">
          {error && (
            <div
              className="mb-6 rounded-xl p-4 text-sm"
              style={{ background: 'var(--error)', color: 'white' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-5">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Crea tu cuenta</h1>
                  <p style={{ color: 'var(--fg-secondary)' }}>Únete a la red de músicos de mariachi</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
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
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>¿Qué instrumento tocas?</h1>
                  <p style={{ color: 'var(--fg-secondary)' }}>Selecciona tu instrumento principal</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {instruments.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setInstrument(inst.id)}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        background: instrument === inst.id ? 'var(--accent-subtle)' : 'var(--surface)',
                        borderColor: instrument === inst.id ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      <span className="text-2xl mb-2 block">{inst.emoji}</span>
                      <span
                        className="font-medium"
                        style={{ color: instrument === inst.id ? 'var(--accent)' : 'var(--fg)' }}
                      >
                        {inst.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--fg)' }}>¿Dónde te ubicas?</h1>
                  <p style={{ color: 'var(--fg-secondary)' }}>Selecciona tu comuna principal de trabajo</p>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                  {comunas.map((com) => (
                    <button
                      key={com}
                      type="button"
                      onClick={() => setComuna(com)}
                      className="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between"
                      style={{
                        background: comuna === com ? 'var(--accent-subtle)' : 'var(--surface)',
                        borderColor: comuna === com ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      <span
                        className="font-medium"
                        style={{ color: comuna === com ? 'var(--accent)' : 'var(--fg)' }}
                      >
                        {com}
                      </span>
                      {comuna === com && <IconCheck size={20} style={{ color: 'var(--accent)' }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 space-y-3">
              <button
                type="submit"
                disabled={!canProceed() || isLoading}
                className="w-full rounded-xl py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                {isLoading ? 'Creando cuenta...' : step === 3 ? 'Crear Cuenta' : 'Continuar'}
              </button>

              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="w-full py-3 font-medium transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Volver
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/auth/login"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              Inicia sesión
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
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--accent-subtle)' }}
            >
              <IconConfettiFilled size={40} style={{ color: '#E11D48' }} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Únete a la comunidad de músicos
            </h2>
            <p className="text-white/80 text-lg">
              Conecta con otros músicos, forma grupos y aumenta tus oportunidades de trabajo.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <BenefitItem text="Registro gratuito en minutos" />
            <BenefitItem text="Encuentra músicos cerca de ti" />
            <BenefitItem text="Gestiona tu agenda de serenatas" />
            <BenefitItem text="Recibe notificaciones de trabajo" />
          </div>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-white/70 text-sm">Músicos activos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">50+</p>
                <p className="text-white/70 text-sm">Comunas cubiertas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">100%</p>
                <p className="text-white/70 text-sm">Gratis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
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
