"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, useToast } from '@simple/ui';

export default function ConfirmClient({ emailFromQuery = '', confirmedFlag = false }: { emailFromQuery?: string, confirmedFlag?: boolean }) {
  const { openAuthModal } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [count, setCount] = useState(5);
  const [email] = useState(emailFromQuery);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Eliminado estado 'error' previamente reportado por ESLint (no se usaba)

  // Detectar si hay code o access_token en la URL
  // Extrae par�metros del hash si existen
  const [hashConfirmed, setHashConfirmed] = useState(false);
  useEffect(() => {
    function checkHash() {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
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
  const isConfirmed = confirmedFlag || !!code || !!accessToken || hashConfirmed;

  useEffect(() => {
    if (isConfirmed) {
      const t = setInterval(() => setCount((c) => c - 1), 1000);
      const timeout = setTimeout(() => router.push('/panel'), 5000);
      return () => { clearInterval(t); clearTimeout(timeout); };
    }
    return;
  }, [isConfirmed, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email) return addToast('Introduce un correo v�lido', { type: 'error' });
    try {
      setSending(true);
      const res = await fetch('/api/auth/resend-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) {
        addToast(data?.error || 'No se pudo reenviar el correo', { type: 'error' });
      } else {
        addToast('Correo de confirmaci�n reenviado.', { type: 'success' });
      }
    } catch {
      addToast('Error al reenviar el correo.', { type: 'error' });
    } finally {
      setSending(false);
      setCooldown(60);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg p-6">
      <div className="max-w-xl w-full card-surface shadow-card rounded-lg p-8">
        {isConfirmed ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">�Correo confirmado exitosamente!</h1>
            <p className="text-lighttext/80 dark:text-darktext/80 mb-6">Tu cuenta ya está lista. Serás redirigido al panel en <strong>{count}</strong> segundos...</p>
            <Button onClick={() => router.push('/panel')} variant="primary">Ir al Panel</Button>
            <div className="mt-4">
              <button type="button" className="text-primary underline" onClick={() => openAuthModal('login')}>�Ya tienes cuenta? Inicia sesi�n</button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">Confirma tu correo</h1>
            <p className="text-lighttext/80 dark:text-darktext/80 mb-4">Hemos enviado un correo de confirmación a: <strong>{email || 'tu correo'}</strong></p>
            <div className="flex flex-col md:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={() => openAuthModal('login')}>Ir a login</Button>
              <Button variant="outline" onClick={handleResend} disabled={sending || cooldown > 0}>
                {sending ? 'Enviando...' : cooldown > 0 ? `Reintentar en ${cooldown}s` : 'Reenviar correo'}
              </Button>
            </div>
            <div className="text-xs text-lighttext/70 dark:text-darktext/70 mt-4">¿No llegó? Revisa la carpeta de spam, espera unos minutos o prueba reenviar.</div>
          </div>
        )}
      </div>
    </div>
  );
}







