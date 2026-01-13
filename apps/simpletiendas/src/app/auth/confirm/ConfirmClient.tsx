"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@simple/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, useToast } from '@simple/ui';

export default function ConfirmClient({
  emailFromQuery = '',
  confirmedFlag = false,
}: {
  emailFromQuery?: string;
  confirmedFlag?: boolean;
}) {
  const { openAuthModal, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const shownToastRef = useRef(false);

  const [hashType, setHashType] = useState<string | null>(null);

  const [count, setCount] = useState(5);
  const [email] = useState(emailFromQuery);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(confirmedFlag);

  const authType = searchParams.get('type') || hashType;
  // Supabase puede redirigir sin `email` en query (ej: `type=signup&code=...`).
  // Si no hay `type` ni `email`, este flujo suele ser callback OAuth (Google).
  const isEmailConfirmationFlow =
    !!email ||
    authType === 'signup' ||
    authType === 'invite' ||
    authType === 'email_change' ||
    authType === 'magiclink' ||
    authType === 'recovery';

  // Detectar si hay code o access_token en la URL
  // Extrae parámetros del hash si existen
  const [hashConfirmed, setHashConfirmed] = useState(false);
  useEffect(() => {
    function checkHash() {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        setHashType(params.get('type'));
        if (params.get('access_token') || params.get('code')) {
          setHashConfirmed(true);
        }
      }
    }
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const code = searchParams.get('code');
  const accessToken = searchParams.get('access_token');
  const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
  const cameFromConfirmationEvent = !!(code || accessToken || hashConfirmed || confirmedFlag);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code && !accessToken && !hashConfirmed && !confirmedFlag && !tokenHash) return;
      setProcessing(true);
      setConfirmError(null);
      try {
        // 0) Si llega como `token_hash` (algunas configuraciones), verificar OTP para obtener sesión.
        if (tokenHash && authType) {
          try {
            const { error: verifyError } = await (supabase.auth as any).verifyOtp({
              token_hash: tokenHash,
              type: authType,
            });
            if (verifyError) {
              // seguimos intentando con otros mecanismos
            }
          } catch {
            // ignore
          }
        }

        // 1) Si detectSessionInUrl ya funcionó (hash access_token), esto debe estar listo.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          if (!active) return;
          if (isEmailConfirmationFlow) {
            if (cameFromConfirmationEvent) {
              try {
                const key = `simple:email-confirmation-seen:${session.user.id}`;
                const alreadySeen = typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
                if (alreadySeen) {
                  router.replace('/panel');
                  return;
                }
                if (typeof window !== 'undefined') window.localStorage.setItem(key, '1');
              } catch {
                // ignore
              }
            }
            setConfirmed(true);
          } else {
            router.replace('/panel');
          }
          return;
        }

        // 2) Si viene con PKCE (code=...), intercambiar por sesión.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (active)
              setConfirmError('No pudimos validar tu acceso. Intenta nuevamente o solicita un nuevo correo.');
            return;
          }
          const {
            data: { session: sessionAfter },
          } = await supabase.auth.getSession();
          if (!active) return;
          if (sessionAfter?.user) {
            if (isEmailConfirmationFlow) {
              if (cameFromConfirmationEvent) {
                try {
                  const key = `simple:email-confirmation-seen:${sessionAfter.user.id}`;
                  const alreadySeen = typeof window !== 'undefined' && window.localStorage.getItem(key) === '1';
                  if (alreadySeen) {
                    router.replace('/panel');
                    return;
                  }
                  if (typeof window !== 'undefined') window.localStorage.setItem(key, '1');
                } catch {
                  // ignore
                }
              }
              setConfirmed(true);
            } else {
              router.replace('/panel');
            }
          }
        }
      } catch {
        if (active) setConfirmError('Ocurrió un problema al confirmar. Intenta nuevamente.');
      } finally {
        if (active) setProcessing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken, authType, cameFromConfirmationEvent, code, hashConfirmed, confirmedFlag, supabase, router, isEmailConfirmationFlow, tokenHash]);

  const isConfirmed = confirmed && isEmailConfirmationFlow;

  useEffect(() => {
    if (!isConfirmed) return;
    if (shownToastRef.current) return;
    shownToastRef.current = true;
    const msg =
      authType === 'email_change'
        ? 'Correo actualizado. Tu cambio ya está activo.'
        : authType === 'recovery'
          ? 'Enlace validado. Ahora puedes cambiar tu contraseña.'
          : 'Correo confirmado. Tu cuenta ya está activa.';
    addToast(msg, { type: 'success' });
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem('simple_pending_verification_email');
    } catch {
      // ignore
    }
  }, [addToast, authType, isConfirmed]);

  useEffect(() => {
    if (!isConfirmed) return;
    const t = setInterval(() => setCount((c) => c - 1), 1000);
    const timeout = setTimeout(() => router.push('/panel'), 5000);
    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [isConfirmed, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email) return addToast('Introduce un correo válido', { type: 'error' });
    try {
      setSending(true);
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data?.error || 'No se pudo reenviar el correo', { type: 'error' });
      } else {
        addToast('Listo. Te reenviamos el correo de confirmación.', { type: 'success' });
      }
    } catch {
      addToast('Error al reenviar el correo.', { type: 'error' });
    } finally {
      setSending(false);
      setCooldown(60);
    }
  }

  if (!isEmailConfirmationFlow) {
    if (confirmError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg p-6">
          <div className="max-w-xl w-full card-surface shadow-card rounded-lg p-8 text-center">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No pudimos iniciar sesión</h1>
            <div className="text-sm text-[var(--color-danger)] mb-4">{confirmError}</div>
            <Button variant="primary" onClick={() => openAuthModal('login')}>Volver a intentar</Button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg p-6">
      <div className="max-w-xl w-full card-surface shadow-card rounded-lg p-8">
        {isConfirmed ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">¡Correo confirmado!</h1>
            <p className="text-lighttext/80 dark:text-darktext/80 mb-6">
              Tu cuenta ya está lista. Serás redirigido al panel en <strong>{count}</strong> segundos...
            </p>
            <Button onClick={() => router.push('/panel')} variant="primary">
              Ir al Panel
            </Button>
            <div className="mt-4">
              <button type="button" className="text-primary underline" onClick={() => openAuthModal('login')}>
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Confirma tu correo</h1>
            <p className="text-lighttext/80 dark:text-darktext/80 mb-4">
              Hemos enviado un correo de confirmación a: <strong>{email || 'tu correo'}</strong>
            </p>

            {processing ? (
              <div className="text-sm text-lighttext/70 dark:text-darktext/70 mb-4">Validando tu confirmación...</div>
            ) : null}

            {confirmError ? <div className="text-sm text-[var(--color-danger)] mb-4">{confirmError}</div> : null}

            <div className="flex flex-col md:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={() => openAuthModal('login')}>
                Ir a login
              </Button>
              <Button variant="outline" onClick={handleResend} disabled={sending || cooldown > 0 || processing}>
                {sending ? 'Enviando...' : cooldown > 0 ? `Reintentar en ${cooldown}s` : 'Reenviar correo'}
              </Button>
            </div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-4">
              ¿No llegó? Revisa la carpeta de spam, espera unos minutos o prueba reenviar.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
