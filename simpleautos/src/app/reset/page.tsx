"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function ResetPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get('token') || '';
    setToken(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!token) return setErr('Token faltante');
    if (!password || password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres');
    if (password !== password2) return setErr('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, password }) });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Error al restablecer');
      }
      setOk(true);
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white dark:bg-darkcard rounded-2xl shadow-card ring-1 ring-black/5 dark:ring-white/5 p-6">
      <h1 className="text-xl font-semibold mb-2 text-black dark:text-white">Restablecer contraseña</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nueva contraseña</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full h-10 px-4 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black transition-colors" />
        </div>
        <div>
          <label className="block text-sm mb-1">Repetir contraseña</label>
          <input type="password" value={password2} onChange={(e)=>setPassword2(e.target.value)} className="w-full h-10 px-4 text-sm rounded-lg bg-[var(--field-bg)] text-[var(--field-text)] border border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--field-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black transition-colors" />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
  <Button type="submit" loading={loading} className="w-full" shape="rounded">Restablecer</Button>
      </form>
      {ok && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 p-3 rounded-lg">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </div>
      )}
    </div>
  );
}
