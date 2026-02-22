"use client";
import React, { useMemo, useState } from 'react';
import { Button, Input, useToast } from '@simple/ui';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const { addToast } = useToast();

  const resetToken = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const search = new URLSearchParams(window.location.search);
    const direct = search.get('token') || search.get('code') || search.get('access_token');
    if (direct) return String(direct).trim();

    const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(rawHash || '');
    const fromHash = hashParams.get('token') || hashParams.get('access_token');
    return fromHash ? String(fromHash).trim() : '';
  }, []);

  const hasRecoveryToken = Boolean(resetToken);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!hasRecoveryToken) return setErr('Abre el enlace desde tu correo para poder cambiar la contrasena.');
    if (!password || password.length < 8) return setErr('La contrasena debe tener al menos 8 caracteres');
    if (password !== password2) return setErr('Las contrasenas no coinciden');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Error al restablecer'));
      }
      setOk(true);
      addToast('Contrasena actualizada. Inicia sesion con tu nueva contrasena.', { type: 'success' });
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg p-6">
      <div className="max-w-md w-full card-surface shadow-card rounded-2xl p-6">
        <h1 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Restablecer contrasena</h1>

        {ok ? (
          <div className="text-center">
            <div className="mt-4 text-sm text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] p-3 rounded-lg">
              Contrasena actualizada. Ahora inicia sesion con tu nueva contrasena.
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  openAuthModal('login');
                  router.replace('/');
                }}
              >
                Iniciar sesion
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.replace('/')}
              >
                Volver al inicio
              </Button>
            </div>
          </div>
        ) : (
          <>
            {!hasRecoveryToken ? (
              <div className="mb-4 text-sm text-lighttext/80 dark:text-darktext/80">
                Para cambiar tu contrasena, abre el enlace de recuperacion enviado por correo. Si el enlace expiro, solicita uno nuevo.
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <Input
                type="password"
                label="Nueva contrasena"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="w-full"
              />
              <Input
                type="password"
                label="Repetir contrasena"
                value={password2}
                onChange={(e)=>setPassword2(e.target.value)}
                className="w-full"
              />
              {err && <div className="text-sm text-[var(--color-danger)]">{err}</div>}
              <Button type="submit" loading={loading} className="w-full" shape="rounded" disabled={!hasRecoveryToken || loading}>Restablecer</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
