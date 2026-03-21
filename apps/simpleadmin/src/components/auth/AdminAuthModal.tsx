'use client';

import { useEffect, useRef, useState } from 'react';
import { IconX, IconBrandGoogle, IconMail, IconLock } from '@tabler/icons-react';
import { PanelButton, PanelIconButton, PanelNotice } from '@simple/ui';
import GoogleLoginButton from '@/components/GoogleLoginButton';

type Mode = 'login' | 'recovery';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin?: (email: string, password: string) => Promise<boolean>;
  onRequestPasswordReset?: (email: string) => Promise<{ ok: boolean; error?: string }>;
}

export function AdminAuthModal({ open, onClose, onLogin, onRequestPasswordReset }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);

  if (!open) return null;

  const resetLocalState = () => {
    setMode('login');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setSubmitting(false);
    setRecoveryCooldown(0);
  };

  const handleClose = () => {
    if (submitting) return;
    resetLocalState();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, submitting]);

  useEffect(() => {
    if (!recoveryCooldown) return;
    const intervalId = window.setInterval(() => {
      setRecoveryCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [recoveryCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (onLogin) {
        const ok = await onLogin(email, password);
        if (ok) {
          handleClose();
        } else {
          setError('Correo electrónico o contraseña incorrectos.');
        }
      }
    } catch (err) {
      setError('Error al conectar. Intenta más tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (!onRequestPasswordReset) {
        setError('La recuperación de contraseña no está disponible en este entorno.');
        return;
      }
      const result = await onRequestPasswordReset(email);
      if (!result.ok) {
        setError(result.error || 'No pudimos iniciar la recuperación.');
        return;
      }
      setSuccess('Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.');
      setRecoveryCooldown(30);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-md mx-4 rounded-xl p-6 animate-scale-in"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <PanelIconButton onClick={handleClose} label="Cerrar modal" variant="soft" size="md" className="absolute right-3 top-3 rounded-xl" disabled={submitting}>
          <IconX size={16} />
        </PanelIconButton>

        {mode === 'login' && (
          <>
            <h2 id="admin-auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
              Acceso de Administrador
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
              Inicia sesión en SimpleAdmin
            </p>
            {error ? (
              <PanelNotice tone="error" className="mb-3">
                {error}
              </PanelNotice>
            ) : null}
            <form onSubmit={handleLogin} className="space-y-3" aria-label="Formulario de inicio de sesión administrativo">
              <div className="relative">
                <IconMail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input form-input-has-leading-icon"
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <div className="relative">
                <IconLock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input form-input-has-leading-icon"
                  placeholder="Contraseña"
                  required
                />
              </div>
              <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Ingresando...' : 'Iniciar sesión'}
              </PanelButton>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                o
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <GoogleLoginButton disabled={submitting} onError={(message) => setError(message)}>
              <PanelButton variant="secondary" className="w-full" disabled={submitting}>
                <IconBrandGoogle size={15} /> Continuar con Google
              </PanelButton>
            </GoogleLoginButton>

            <div className="text-center mt-4 text-sm">
              <button
                onClick={() => {
                  setMode('recovery');
                  setError('');
                }}
                style={{ color: 'var(--fg-muted)' }}
                disabled={submitting}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </>
        )}

        {mode === 'recovery' && (
          <>
            <h2 id="admin-auth-modal-title" className="text-lg font-semibold mb-1" style={{ color: 'var(--fg)' }}>
              Recuperar contraseña
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
            {error ? (
              <PanelNotice tone="error" className="mb-3">
                {error}
              </PanelNotice>
            ) : null}
            {success ? (
              <PanelNotice tone="success" className="mb-3">
                {success}
              </PanelNotice>
            ) : null}
            <form onSubmit={handleRecovery} className="space-y-3" aria-label="Formulario de recuperación de contraseña administrativa">
              <div className="relative">
                <IconMail size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input form-input-has-leading-icon"
                  placeholder="Correo electrónico"
                  required
                />
              </div>
              <PanelButton type="submit" variant="primary" className="w-full" disabled={submitting || recoveryCooldown > 0}>
                {recoveryCooldown > 0 ? `Reintenta en ${recoveryCooldown}s` : submitting ? 'Enviando...' : 'Enviar enlace'}
              </PanelButton>
            </form>
            <div className="text-center mt-4 text-sm">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="font-medium"
                style={{ color: 'var(--fg)' }}
                disabled={submitting}
              >
                Volver al inicio de sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
