'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GoogleCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Enviar código al backend
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
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
          window.location.replace('/');
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
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
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
              Error de conexión
            </h2>
            <p style={{ color: 'var(--fg-muted)' }} className="mb-4">
              No se pudo conectar con Google. Inténtalo de nuevo.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-lg px-4 py-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
