'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconMail, IconSend } from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { normalizeEmail } from '@simple/auth';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      const data = await response.json().catch(() => ({ ok: false }));
      if (!response.ok || !data.ok) {
        setStatus('error');
        setMessage(data.error || 'No pudimos procesar tu solicitud. Intenta de nuevo.');
        return;
      }
      setStatus('success');
      setMessage('Si tu correo existe, te enviamos un enlace para restablecer tu contraseña.');
    } catch {
      setStatus('error');
      setMessage('No pudimos conectarnos. Intenta de nuevo en unos minutos.');
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
            <IconMail size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>
            Recupera tu acceso
          </h1>
          <p className="type-page-subtitle mb-5 mt-2">
            Te enviaremos un enlace para crear una nueva contraseña.
          </p>

          {status !== 'idle' && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-sm"
              style={{ background: status === 'success' ? 'var(--success)' : 'var(--error)', color: 'var(--accent-contrast)' }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3.5 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
            >
              <IconSend size={18} />
              {isLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
