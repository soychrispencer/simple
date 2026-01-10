"use client";
import React, { useState } from 'react';
import { Button, Input } from '@simple/ui';
import Link from 'next/link';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setOk(false); setToken(null);
    try {
      const res = await fetch('/api/auth/forgot', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
      const data = await res.json();
      setOk(true);
      if (data.token) setToken(data.token);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto my-10 card-surface shadow-card rounded-2xl p-6">
      <h1 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Recuperar contraseña</h1>
      <p className="text-sm text-lighttext/80 dark:text-darktext/80 mb-4">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          required
          type="email"
          label="Correo"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full"
        />
        <Button type="submit" loading={loading} className="w-full" shape="rounded">Enviar enlace</Button>
      </form>
      {ok && (
        <div className="mt-4 text-sm text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] p-3 rounded-lg">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña.
        </div>
      )}
      {token && (
        <div className="mt-3 text-xs text-lighttext/70 dark:text-darktext/70">
          En desarrollo: usa este token para pruebas. <br/>
          <span className="break-all font-mono">{token}</span><br/>
          <Link href={`/reset?token=${token}`} className="link-base link-plain">Ir a restablecer</Link>
        </div>
      )}
    </div>
  );
}







