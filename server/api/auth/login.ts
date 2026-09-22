import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { authRateLimiter } from '../_lib/rate-limit';
import { findUserByEmail, verifyPassword, createSession, createSessionCookie } from '../_lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await authRateLimiter(`login:${ip}`);
  
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Too many login attempts',
      retryAfter: rateLimit.retryAfterMs,
    });
  }
  
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    
    const { email, password } = parsed.data;
    
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { session, token } = await createSession(user.id);
    
    const cookie = createSessionCookie(token, session.expiresAt);
    res.setHeader('Set-Cookie', cookie);
    
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}