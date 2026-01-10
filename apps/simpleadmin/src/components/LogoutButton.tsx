'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@simple/ui';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setLoading(false);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={onLogout} disabled={loading}>
      {loading ? 'Cerrando…' : 'Cerrar sesión'}
    </Button>
  );
}
