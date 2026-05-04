'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconLock, IconCheck } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { AUTH_PASSWORD_MIN_LENGTH, getPasswordStrength } from '@simple/auth';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const strength = useMemo(() => {
    return getPasswordStrength(password);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Este enlace no es válido.');
      return;
    }
    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(`Tu contraseña debe tener al menos ${AUTH_PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({ ok: false }));
      if (!response.ok || !data.ok) {
        setError(data.error || 'No pudimos actualizar tu contraseña.');
        return;
      }
      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => router.push('/inicio'), 1000);
    } catch {
      setError('No pudimos conectarnos. Intenta de nuevo en unos minutos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="serenatas-interactive inline-flex items-center gap-2 mb-6 text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
          <IconArrowLeft size={18} />
          Volver
        </Link>
        <div className="rounded-2xl border p-6 sm:p-7" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)' }}>
            {success ? <IconCheck size={22} style={{ color: 'var(--success)' }} /> : <IconLock size={22} style={{ color: 'var(--accent)' }} />}
          </div>
          <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>
            {success ? 'Contraseña actualizada' : 'Crea una nueva contraseña'}
          </h1>
          {!success && (
            <p className="type-page-subtitle mb-5 mt-2">
              Tu nueva contraseña te permitirá volver a entrar de inmediato.
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--error)', color: 'var(--accent-contrast)' }}>
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}>
              Listo. Te estamos redirigiendo.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                  required
                />
                {password.length > 0 && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    Seguridad: {strength === 'low' ? 'baja' : strength === 'medium' ? 'media' : strength === 'high' ? 'alta' : 'baja'}.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                  Repite tu contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl py-3.5 font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                {isLoading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
            Cargando...
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
