import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptCredentials, decryptCredentials } from '../../api/_lib/encryption';
import { createRateLimiter } from '../../api/_lib/rate-limit';
import { createSessionCookie, createExpiredSessionCookie, SESSION_COOKIE_NAME } from '../../api/_lib/auth';

describe('encryption', () => {
  it('roundtrips plaintext', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-vitest-32-chars-min';
    const cipher = encrypt('hello world');
    expect(cipher).not.toContain('hello');
    expect(decrypt(cipher)).toBe('hello world');
  });

  it('produces different ciphertext per call (random IV)', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-vitest-32-chars-min';
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });

  it('roundtrips credential objects', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-vitest-32-chars-min';
    const creds = { apiKey: 'sk-or-secret-value', region: 'us-east-1' };
    const enc = encryptCredentials(creds);
    expect(enc).not.toContain('sk-or-secret-value');
    expect(decryptCredentials(enc)).toEqual(creds);
  });

  it('rejects tampered ciphertext via GCM auth tag', () => {
    process.env.ENCRYPTION_KEY = 'test-key-for-vitest-32-chars-min';
    const enc = encrypt('tamper test');
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString('base64');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws without ENCRYPTION_KEY', () => {
    const prev = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/);
    if (prev !== undefined) process.env.ENCRYPTION_KEY = prev;
  });
});

describe('rate-limit', () => {
  it('allows requests under the limit and blocks over it', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3, keyPrefix: 'test' });
    const r1 = await limiter('user-a');
    const r2 = await limiter('user-a');
    const r3 = await limiter('user-a');
    const r4 = await limiter('user-a');
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks keys independently', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1, keyPrefix: 'test-iso' });
    const a = await limiter('user-1');
    const b = await limiter('user-2');
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});

describe('session cookies', () => {
  it('sets HttpOnly Secure SameSite with no hardcoded domain', () => {
    const cookie = createSessionCookie('tok123', new Date('2030-01-01T00:00:00Z'));
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=tok123`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Domain=');
  });

  it('honours SESSION_COOKIE_DOMAIN when explicitly configured', () => {
    process.env.SESSION_COOKIE_DOMAIN = '.listing.ai';
    const cookie = createSessionCookie('tok', new Date('2030-01-01T00:00:00Z'));
    expect(cookie).toContain('Domain=.listing.ai');
    delete process.env.SESSION_COOKIE_DOMAIN;
  });

  it('expired cookie clears the session', () => {
    const cookie = createExpiredSessionCookie();
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
  });
});
