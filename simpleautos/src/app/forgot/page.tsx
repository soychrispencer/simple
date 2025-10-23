"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
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
    <div className="max-w-md mx-auto my-10 bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
      <h1 className="text-xl font-semibold mb-2 text-black dark:text-white">Recuperar contraseña</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Correo</label>
          <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full h-10 px-4 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black transition-colors" />
        </div>
  <Button type="submit" loading={loading} className="w-full" shape="rounded">Enviar enlace</Button>
      </form>
      {ok && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 p-3 rounded-lg">
          Si el correo existe, recibirás un enlace para restablecer tu contraseña.
        </div>
      )}
      {token && (
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          En desarrollo: usa este token para pruebas. <br/>
          <span className="break-all font-mono">{token}</span><br/>
          <Link href={`/reset?token=${token}`} className="link-base link-plain">Ir a restablecer</Link>
        </div>
      )}
    </div>
  );
}
