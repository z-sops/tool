import { createServer } from 'node:net';

/**
 * Resolve a free TCP port for isolated local verification.
 *
 * ListingAI must never assume a common development port (3000, 5173, 8080, ...)
 * is available: this machine runs several independent applications at once.
 * The probe binds to 127.0.0.1 on the candidate port and releases it again.
 */
export function isPortFree(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen({ port, host, exclusive: true });
  });
}

/**
 * Return the first free port at or after `preferred`, scanning `attempts` candidates.
 * Throws when no candidate is free so the caller fails fast instead of silently
 * reusing a foreign server.
 */
export async function findFreePort(preferred, attempts = 40, host = '127.0.0.1') {
  for (let i = 0; i < attempts; i++) {
    const candidate = preferred + i;
    if (candidate > 65535) break;
    if (await isPortFree(candidate, host)) return candidate;
  }
  throw new Error(
    `No free port found in range ${preferred}-${preferred + attempts - 1} on ${host}.`,
  );
}