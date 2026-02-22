"use client";
import React, { useState } from 'react';
import { Button, Input } from '@simple/ui';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOk(false);
    setErr(null);
    setDebugResetUrl(null);
    try {
      const response = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        setErr(String(payload?.error || 'No se pudo procesar la solicitud'));
        return;
      }
      if (typeof (payload as any)?.debugResetUrl === 'string') {
        setDebugResetUrl((payload as any).debugResetUrl);
      }
      setOk(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 card-surface shadow-card rounded-2xl p-6">
      <h1 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Recuperar contrasena</h1>
      <p className="text-sm text-lighttext/80 dark:text-darktext/80 mb-4">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          required
          type="email"
          label="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
        <Button type="submit" loading={loading} className="w-full" shape="rounded">
          Enviar enlace
        </Button>
      </form>
      {err && (
        <div className="mt-4 text-sm text-[var(--color-danger)] bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] p-3 rounded-lg">
          {err}
        </div>
      )}
      {ok && (
        <div className="mt-4 text-sm text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] p-3 rounded-lg">
          Si el correo existe, recibiras un enlace para restablecer tu contrasena.
          {debugResetUrl ? (
            <div className="mt-2 break-all">
              Debug enlace: <a className="underline" href={debugResetUrl}>{debugResetUrl}</a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
