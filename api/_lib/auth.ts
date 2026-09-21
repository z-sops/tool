import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import type { VercelRequest } from '@vercel/node';
import { getDb } from '../../src/server/db/client';
import { users, sessions, type User, type Session } from '../../src/server/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export const SESSION_COOKIE_NAME = 'ns_session';
export const SESSION_DURATION_DAYS = 30;
export const SESSION_TOKEN_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Cookie attribute builder. Domain is intentionally omitted unless an explicit
 * custom domain is configured via env (SESSION_COOKIE_DOMAIN). Hardcoding a
 * domain that doesn't match the deployment host makes browsers silently reject
 * the cookie (e.g. on *.vercel.app deployments).
 */
function buildSessionCookie(token: string, expiresAt: Date, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${expiresAt.toUTCString()}`,
    'Path=/',
  ];
  const domain = process.env.SESSION_COOKIE_DOMAIN;
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  return parts.join('; ');
}

export function createSessionCookie(token: string, expiresAt: Date): string {
  return buildSessionCookie(token, expiresAt, SESSION_DURATION_DAYS * 24 * 60 * 60);
}

export function createExpiredSessionCookie(): string {
  return buildSessionCookie('', new Date(0), 0);
}

export function extractSessionToken(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const prefix = `${SESSION_COOKIE_NAME}=`;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(prefix));
  if (!sessionCookie) return null;

  return sessionCookie.slice(prefix.length) || null;
}

export async function createUser(email: string, password: string, displayName?: string): Promise<User> {
  const db = getDb();
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash,
    displayName,
  }).returning();
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user || null;
}

export async function createSession(userId: string): Promise<{ session: Session; token: string }> {
  const db = getDb();
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  
  const [session] = await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  }).returning();
  
  return { session, token };
}

export async function validateSession(token: string): Promise<{ user: User; session: Session } | null> {
  const db = getDb();
  const tokenHash = hashToken(token);
  
  const [result] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(
      eq(sessions.tokenHash, tokenHash),
      gt(sessions.expiresAt, new Date())
    ))
    .limit(1);
  
  if (!result) return null;
  
  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, result.session.id));
  
  return { user: result.user, session: result.session };
}

export async function deleteSession(token: string): Promise<void> {
  const db = getDb();
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDb();
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return result.rowCount ?? 0;
}