'use client';

import { useState, cloneElement, type ReactElement } from 'react';

type GoogleLoginChildProps = {
  onClick?: () => void;
  disabled?: boolean;
};

type GoogleLoginButtonProps = {
  children: ReactElement<GoogleLoginChildProps>;
  disabled?: boolean;
  onError?: (message: string) => void;
};

export default function GoogleLoginButton({ children, disabled = false, onError }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const handleGoogleLogin = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);

      // Obtener URL de autorización
      const response = await fetch(`${API_BASE}/api/auth/google`, {
        credentials: 'include',
      });
      const data = (await response.json().catch(() => null)) as { authUrl?: string; error?: string } | null;

      if (!response.ok || !data?.authUrl) {
        throw new Error(data?.error || 'No pudimos iniciar el acceso con Google.');
      }

      // Redirigir a Google
      window.location.href = data.authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos iniciar el acceso con Google.';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  // Clonar el elemento children y agregar el onClick handler
  return cloneElement(children, {
    onClick: handleGoogleLogin,
    disabled: disabled || loading,
  });
}
