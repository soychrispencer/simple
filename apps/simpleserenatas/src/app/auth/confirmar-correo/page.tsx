'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconCheck, IconX, IconLoader2, IconArrowRight } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Token de confirmación no válido.');
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/email-verification/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({ ok: false, error: 'No pudimos validar tu correo.' }));

        if (data.ok) {
          setStatus('success');
          // Redirect to onboarding after 3 seconds
          redirectTimerRef.current = setTimeout(() => {
            router.push('/inicio');
          }, 3000);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'El enlace de confirmación es inválido o expiró.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Error de conexión. Intenta más tarde.');
      }
    };

    confirmEmail();
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Loading state */}
          {status === 'loading' && (
            <>
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'var(--accent-subtle)' }}
              >
                <IconLoader2 size={40} style={{ color: 'var(--accent)' }} className="animate-spin" />
              </div>
              <h1 className="type-page-title mb-3" style={{ color: 'var(--fg)' }}>
                Confirmando tu correo...
              </h1>
              <p className="type-page-subtitle">
                Estamos verificando tu cuenta. Espera un momento.
              </p>
            </>
          )}

          {/* Success state */}
          {status === 'success' && (
            <>
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'var(--success)' }}
              >
                <IconCheck size={40} style={{ color: 'var(--accent-contrast)' }} />
              </div>
              <h1 className="type-page-title mb-3" style={{ color: 'var(--fg)' }}>
                ¡Correo confirmado!
              </h1>
              <p className="type-page-subtitle mb-6">
                Tu cuenta ha sido activada exitosamente. Serás redirigido para usar la plataforma.
              </p>
              <Link
                href="/inicio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                Continuar
                <IconArrowRight size={18} />
              </Link>
            </>
          )}

          {/* Error state */}
          {status === 'error' && (
            <>
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'var(--error)' }}
              >
                <IconX size={40} style={{ color: 'var(--accent-contrast)' }} />
              </div>
              <h1 className="type-page-title mb-3" style={{ color: 'var(--fg)' }}>
                Error de confirmación
              </h1>
              <p className="type-page-subtitle mb-6">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/registro"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                >
                  Crear nueva cuenta
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--accent-subtle)' }}
            >
              <IconLoader2 size={40} style={{ color: 'var(--accent)' }} className="animate-spin" />
            </div>
            <h1 className="type-page-title mb-3" style={{ color: 'var(--fg)' }}>
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
