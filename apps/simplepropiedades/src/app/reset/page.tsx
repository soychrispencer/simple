"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, useToast } from '@simple/ui';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { useAuth } from '@simple/auth';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const { addToast } = useToast();

  const recoveryHint = useMemo(() => {
    if (typeof window === 'undefined') return { isRecovery: false, hasCode: false };
    const search = new URLSearchParams(window.location.search);
    const hasCode = !!search.get('code');
    const hasAccessToken = !!search.get('access_token');
    const type = search.get('type');
    const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const hashParams = new URLSearchParams(rawHash || '');
    const hashType = hashParams.get('type');
    const isRecovery = type === 'recovery' || hashType === 'recovery' || hasAccessToken || !!hashParams.get('access_token') || hasCode;
    return { isRecovery, hasCode };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();

        if (recoveryHint.hasCode) {
          try {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) await supabase.auth.exchangeCodeForSession(code);
          } catch {
            // ignore
          }
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        setHasRecoverySession(Boolean(recoveryHint.isRecovery && session));
      } catch {
        if (!active) return;
        setHasRecoverySession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [recoveryHint.hasCode, recoveryHint.isRecovery]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!hasRecoverySession) return setErr('Abre el enlace desde tu correo para poder cambiar la contraseña.');
    if (!password || password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    if (password !== password2) return setErr('Las contraseñas no coinciden');

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message || 'Error al restablecer');
      await supabase.auth.signOut();
      setOk(true);
      addToast('Contraseña actualizada. Inicia sesión con tu nueva contraseña.', { type: 'success' });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-lightbg dark:bg-darkbg p-6">
      <div className="max-w-md w-full card-surface shadow-card rounded-2xl p-6">
        <h1 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Restablecer contraseña</h1>

        {ok ? (
          <div className="text-center">
            <div className="mt-4 text-sm text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] p-3 rounded-lg">
              Contraseña actualizada. Ahora inicia sesión con tu nueva contraseña.
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
                Iniciar sesión
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.replace('/')}>
                Volver al inicio
              </Button>
            </div>
          </div>
        ) : (
          <>
            {hasRecoverySession === false ? (
              <div className="mb-4 text-sm text-lighttext/80 dark:text-darktext/80">
                Para cambiar tu contraseña, abre el enlace de recuperación enviado por correo. Si el enlace expiró, solicita uno nuevo desde el modal de inicio de sesión.
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <Input
                type="password"
                label="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
              <Input
                type="password"
                label="Repetir contraseña"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full"
              />
              {err && <div className="text-sm text-[var(--color-danger)]">{err}</div>}
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                shape="rounded"
                disabled={hasRecoverySession === false || loading}
              >
                Restablecer
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
