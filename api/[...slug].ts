import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse>;

const handlers: Record<string, Handler> = {};

function register(path: string, handler: Handler) {
  handlers[path] = handler;
}

function matchRoute(pathname: string): { handler: Handler; params: Record<string, string> } | null {
  for (const [pattern, handler] of Object.entries(handlers)) {
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '([^/]+)')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    const match = pathname.match(regex);
    if (match) {
      const paramNames = pattern.match(/\{([^}]+)\}/g) || [];
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name.slice(1, -1)] = match[i + 1];
      });
      return { handler, params };
    }
  }
  return null;
}

register('/api/generate', async (req, res) => {
  const { default: handler } = await import('../server/api/generate.js');
  return handler(req, res);
});

register('/api/auth/login', async (req, res) => {
  const { default: handler } = await import('../server/api/auth/login.js');
  return handler(req, res);
});

register('/api/auth/signup', async (req, res) => {
  const { default: handler } = await import('../server/api/auth/signup.js');
  return handler(req, res);
});

register('/api/auth/logout', async (req, res) => {
  const { default: handler } = await import('../server/api/auth/logout.js');
  return handler(req, res);
});

register('/api/auth/session', async (req, res) => {
  const { default: handler } = await import('../server/api/auth/session.js');
  return handler(req, res);
});

register('/api/billing/entitlements', async (req, res) => {
  const { default: handler } = await import('../server/api/billing/entitlements.js');
  return handler(req, res);
});

register('/api/billing/usage', async (req, res) => {
  const { default: handler } = await import('../server/api/billing/usage.js');
  return handler(req, res);
});

register('/api/integrations/configure', async (req, res) => {
  const { default: handler } = await import('../server/api/integrations/configure.js');
  return handler(req, res);
});

register('/api/integrations/proxy', async (req, res) => {
  const { default: handler } = await import('../server/api/integrations/proxy.js');
  return handler(req, res);
});

register('/api/integrations/status', async (req, res) => {
  const { default: handler } = await import('../server/api/integrations/status.js');
  return handler(req, res);
});

register('/api/analyses/list', async (req, res) => {
  const { default: handler } = await import('../server/api/analyses/list.js');
  return handler(req, res);
});

register('/api/analyses/save', async (req, res) => {
  const { default: handler } = await import('../server/api/analyses/save.js');
  return handler(req, res);
});

register('/api/analyses/delete', async (req, res) => {
  const { default: handler } = await import('../server/api/analyses/delete.js');
  return handler(req, res);
});

register('/api/listings/list', async (req, res) => {
  const { default: handler } = await import('../server/api/listings/list.js');
  return handler(req, res);
});

register('/api/listings/save', async (req, res) => {
  const { default: handler } = await import('../server/api/listings/save.js');
  return handler(req, res);
});

register('/api/listings/delete', async (req, res) => {
  const { default: handler } = await import('../server/api/listings/delete.js');
  return handler(req, res);
});

register('/api/notes/save', async (req, res) => {
  const { default: handler } = await import('../server/api/notes/save.js');
  return handler(req, res);
});

register('/api/projects/create', async (req, res) => {
  const { default: handler } = await import('../server/api/projects/create.js');
  return handler(req, res);
});

register('/api/projects/get', async (req, res) => {
  const { default: handler } = await import('../server/api/projects/get.js');
  return handler(req, res);
});

register('/api/projects/list', async (req, res) => {
  const { default: handler } = await import('../server/api/projects/list.js');
  return handler(req, res);
});

register('/api/projects/update', async (req, res) => {
  const { default: handler } = await import('../server/api/projects/update.js');
  return handler(req, res);
});

register('/api/workspace/create', async (req, res) => {
  const { default: handler } = await import('../server/api/workspace/create.js');
  return handler(req, res);
});

register('/api/workspace/list', async (req, res) => {
  const { default: handler } = await import('../server/api/workspace/list.js');
  return handler(req, res);
});

register('/api/workspace/update', async (req, res) => {
  const { default: handler } = await import('../server/api/workspace/update.js');
  return handler(req, res);
});

register('/api/stocklots', async (req, res) => {
  const { default: handler } = await import('../server/api/stocklots/index.js');
  return handler(req, res);
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url || '/').split('?')[0];
  
  const match = matchRoute(pathname);
  if (match) {
    req.query = { ...req.query, ...match.params };
    return match.handler(req, res);
  }
  
  return res.status(404).json({ error: 'Not found' });
}