import type { VercelRequest } from '@vercel/node';

/** Prevent cross-site browser mutations of cookie-authenticated resources. */
export function isTrustedMutationOrigin(req: Pick<VercelRequest, 'headers'>): boolean {
  const origin = req.headers.origin;
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = typeof forwardedHost === 'string' ? forwardedHost : req.headers.host;
  if (typeof origin !== 'string' || typeof host !== 'string') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.host !== host || !['https:', 'http:'].includes(parsed.protocol)) return false;
    const proto = req.headers['x-forwarded-proto'];
    if (typeof proto === 'string' && proto !== parsed.protocol.slice(0, -1)) return false;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}
