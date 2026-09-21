import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { extractSessionToken, validateSession } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(200).json({ user: null });
    }
    
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return res.status(200).json({ user: null });
    }
    
    return res.status(200).json({
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        displayName: sessionData.user.displayName,
        createdAt: sessionData.user.createdAt,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}