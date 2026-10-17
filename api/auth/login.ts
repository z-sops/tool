import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../server/api/auth/login';

// Never attempt account operations without a configured server-side database.
export default function authRoute(req: VercelRequest, res: VercelResponse) {
  if (!process.env.DATABASE_URL) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Stock-Lot login is unavailable: a preview database has not been configured.' });
  }
  return handler(req, res);
}
