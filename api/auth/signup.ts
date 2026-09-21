import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { authRateLimiter } from '../_lib/rate-limit';
import { createUser, findUserByEmail, createSession, createSessionCookie, SESSION_COOKIE_NAME } from '../_lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await authRateLimiter(`signup:${ip}`);
  
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ 
      error: 'Too many signup attempts',
      retryAfter: rateLimit.retryAfterMs,
    });
  }
  
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    
    const { email, password, displayName } = parsed.data;
    
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const user = await createUser(email, password, displayName);
    const { session, token } = await createSession(user.id);
    
    const cookie = createSessionCookie(token, session.expiresAt);
    res.setHeader('Set-Cookie', cookie);
    
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}