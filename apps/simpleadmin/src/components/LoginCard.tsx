'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@simple/ui';

export default function LoginCard({ forbidden = false }: { forbidden?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'No pudimos iniciar sesión');
        return;
      }

      // Nos quedamos en la misma ruta; el server render decidirá si muestra panel o login.
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-var(--header-height,64px))] flex items-center justify-center p-6">
      <div className="w-full max-w-md card-surface shadow-card rounded-3xl p-6">
        <h1 className="text-xl font-semibold text-lighttext dark:text-darktext">Simple Admin</h1>
        <p className="text-sm text-lighttext/70 dark:text-darktext/70 mt-1">
          Inicia sesión para acceder al panel administrativo.
        </p>

        {forbidden && (
          <div className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">
            Acceso restringido: necesitas permisos de administrador.
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-lighttext/80 dark:text-darktext/80">{error}</div>
        )}

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            shape="pill"
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            shape="pill"
          />
          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
