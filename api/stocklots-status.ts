import type { VercelRequest, VercelResponse } from '@vercel/node';

// Preview configuration check. Never return credentials or a connection string.
// This checks configuration only; it does not claim the database is reachable.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  return res.status(200).json({
    service: 'stock-lots',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
}
