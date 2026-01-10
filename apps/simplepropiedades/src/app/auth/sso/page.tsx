import { redirect } from 'next/navigation';
import { ssoUtils } from '@simple/auth';
import { logError } from '@/lib/logger';

export default async function SSOAuthPage({
  searchParams,
}: {
  searchParams: { token?: string; from?: string }
}) {
  const { token, from } = searchParams;
  const returnTo = from && from.startsWith('/') ? from : '/panel';

  if (!token) {
    redirect('/auth/login?error=invalid_sso_token');
  }

  try {
    // Validar el token de SSO
    const appOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const validation = await ssoUtils.validateSSOToken(token, appOrigin);

    if (!validation.valid) {
      redirect('/auth/login?error=expired_sso_token');
    }

    // Aquí implementarías la lógica para crear la sesión
    // Por ahora, redirigir a la ruta solicitada o al panel
    redirect(returnTo);

  } catch (error) {
    logError('SSO validation error:', error);
    redirect('/auth/login?error=sso_validation_failed');
  }
}