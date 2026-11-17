/**
 * HTTPS is the default. Public HTTP can be explicitly enabled for an existing
 * Coolify instance when the operator has authorized that connection.
 */
export function requireSecureCoolifyUrl(value) {
  if (!value) return undefined;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('COOLIFY_URL no es una URL válida.');
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  const isLoopback = loopbackHosts.has(url.hostname.toLowerCase());
  const allowInsecureHttp = process.env.COOLIFY_ALLOW_INSECURE_HTTP === 'true';
  const isAllowedHttp = url.protocol === 'http:' && (isLoopback || allowInsecureHttp);
  if (url.protocol !== 'https:' && !isAllowedHttp) {
    throw new Error(
      'COOLIFY_URL debe usar HTTPS o loopback. Para autorizar HTTP público en esta máquina, establece COOLIFY_ALLOW_INSECURE_HTTP=true.',
    );
  }
  if (url.username || url.password) {
    throw new Error('No incluyas credenciales dentro de COOLIFY_URL.');
  }

  return url.toString().replace(/\/$/, '');
}
