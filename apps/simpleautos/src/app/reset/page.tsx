"use client";
import React, { useState, useEffect } from 'react';
import { Button, Input } from '@simple/ui';

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
    <div className="max-w-md mx-auto my-10 card-surface shadow-card rounded-2xl p-6">
      <h1 className="text-xl font-semibold mb-2 text-lighttext dark:text-darktext">Restablecer contraseña</h1>
      <form onSubmit={submit} className="space-y-4">
        <Input
          type="password"
          label="Nueva contraseña"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full"
        />
        <Input
          type="password"
          label="Repetir contraseña"
          value={password2}
          onChange={(e)=>setPassword2(e.target.value)}
          className="w-full"
        />
        {err && <div className="text-sm text-[var(--color-danger)]">{err}</div>}
        <Button type="submit" loading={loading} className="w-full" shape="rounded">Restablecer</Button>
      </form>
      {ok && (
        <div className="mt-4 text-sm text-[var(--color-success)] bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] p-3 rounded-lg">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </div>
      )}
    </div>
  );
}







