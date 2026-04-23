'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconMusic, IconEye, IconEyeOff, IconArrowLeft, IconCheck } from '@tabler/icons-react';
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
          <IconArrowLeft size={24} className="text-zinc-700" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
            <IconMusic size={16} className="text-white" />
          </div>
          <span className="font-bold text-zinc-900">SimpleSerenatas</span>
        </div>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-500">Paso {step} de 3</span>
          <span className="text-sm font-medium text-rose-600">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Crea tu cuenta</h1>
                <p className="text-zinc-500">Únete a la red de músicos de mariachi</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">¿Qué instrumento tocas?</h1>
                <p className="text-zinc-500">Selecciona tu instrumento principal</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {instruments.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => setInstrument(inst.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      instrument === inst.id
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-zinc-100 hover:border-zinc-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{inst.emoji}</span>
                    <span className={`font-medium ${
                      instrument === inst.id ? 'text-rose-700' : 'text-zinc-900'
                    }`}>
                      {inst.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">¿Dónde te ubicas?</h1>
                <p className="text-zinc-500">Selecciona tu comuna principal de trabajo</p>
              </div>

              <div className="space-y-2">
                {comunas.map((com) => (
                  <button
                    key={com}
                    type="button"
                    onClick={() => setComuna(com)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      comuna === com
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-zinc-100 hover:border-zinc-200'
                    }`}
                  >
                    <span className={`font-medium ${
                      comuna === com ? 'text-rose-700' : 'text-zinc-900'
                    }`}>
                      {com}
                    </span>
                    {comuna === com && <IconCheck size={20} className="text-rose-500" />}
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
              className="w-full bg-rose-500 text-white rounded-xl py-4 font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando cuenta...' : step === 3 ? 'Crear Cuenta' : 'Continuar'}
            </button>
            
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="w-full py-3 text-zinc-500 font-medium hover:text-zinc-700 transition-colors"
              >
                Volver
              </button>
            )}
          </div>
        </form>

        {/* Login Link */}
        <p className="mt-8 text-center text-sm text-zinc-500">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/auth/login" className="text-rose-600 font-semibold hover:text-rose-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
