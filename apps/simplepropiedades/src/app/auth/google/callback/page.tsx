'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, GoogleLoginButton } from '@simple/auth';
import { IconCheck, IconX } from '@tabler/icons-react';
import { PanelButton, PanelNotice } from '@simple/ui';

export default function GoogleCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [returnTo, setReturnTo] = useState('/');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const nextReturnTo = urlParams.get('returnTo') || sessionStorage.getItem('auth.returnTo') || '/';
        setReturnTo(nextReturnTo);

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Enviar código al backend
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000';
        const response = await fetch(`${API_BASE}/api/auth/google/callback`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Authentication failed');
        }

        setStatus('success');

        // Fuerza una recarga completa para rehidratar la sesión recién creada.
        setTimeout(() => {
          sessionStorage.removeItem('auth.returnTo');
          window.location.replace(nextReturnTo);
        }, 1000);

      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md mx-4 rounded-xl p-8 animate-scale-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              Conectando con Google...
            </h2>
            <p style={{ color: 'var(--fg-muted)' }}>
              Estamos verificando tu cuenta
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
              <IconCheck size={22} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              ¡Conexión exitosa!
            </h2>
            <p style={{ color: 'var(--fg-muted)' }}>
              Redirigiendo...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>
              <IconX size={22} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              Error de conexión
            </h2>
            <PanelNotice tone="error" className="mb-4 text-left">
              No se pudo conectar con Google. Inténtalo de nuevo.
            </PanelNotice>
            <PanelButton
              onClick={() => router.push(returnTo)}
              className="w-full"
              variant="primary"
            >
              Volver al inicio
            </PanelButton>
          </div>
        )}
      </div>
    </div>
  );
}
