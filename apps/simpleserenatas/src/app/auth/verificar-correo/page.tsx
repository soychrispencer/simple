'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconMail, IconArrowLeft, IconRefresh, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!email || isResending) return;
    
    setIsResending(true);
    setResendSuccess(false);
    setResendError('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/email-verification/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({ ok: false, error: 'No pudimos reenviar el correo. Intenta más tarde.' }));

      if (data.ok) {
        setResendSuccess(true);
      } else {
        setResendError(data.error || 'No pudimos reenviar el correo. Intenta más tarde.');
      }
    } catch {
      setResendError('Error de conexión. Intenta más tarde.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-8 transition-colors"
          style={{ color: 'var(--fg-muted)' }}
        >
          <IconArrowLeft size={20} />
          <span className="text-sm font-medium">Volver al inicio</span>
        </Link>

        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--accent-subtle)' }}
          >
            <IconMail size={40} style={{ color: 'var(--accent)' }} />
          </div>

          {/* Title */}
          <h1 className="type-page-title mb-3" style={{ color: 'var(--fg)' }}>
            Revisa tu correo
          </h1>

          {/* Description */}
          <p className="type-page-subtitle mb-6">
            Te enviamos un correo de confirmación a{' '}
            <strong style={{ color: 'var(--fg)' }}>{email || 'tu correo'}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>

          {/* Success message */}
          {resendSuccess && (
            <div
              className="flex items-center gap-2 justify-center mb-4 p-3 rounded-xl text-sm"
              style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
            >
              <IconCheck size={16} />
              <span>¡Correo reenviado correctamente!</span>
            </div>
          )}

          {/* Error message */}
          {resendError && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{ background: 'var(--error)', color: 'var(--accent-contrast)' }}
            >
              {resendError}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={isResending || !email}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 mb-4"
            style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
          >
            <IconRefresh size={18} className={isResending ? 'animate-spin' : ''} />
            {isResending ? 'Reenviando...' : 'Reenviar correo'}
          </button>

          {/* Login link */}
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            ¿Ya confirmaste?{' '}
            <Link
              href="/auth/login"
              className="serenatas-interactive font-medium transition-colors hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Iniciar sesión
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center mt-6 text-sm" style={{ color: 'var(--fg-muted)' }}>
          Si no encuentras el correo, revisa tu carpeta de spam.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
