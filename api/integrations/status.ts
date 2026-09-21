import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getAllProviders, getProviderConfig, FUTURE_PROVIDERS, CURRENT_PROVIDERS } from '../../src/lib/integrations/registry';
import { manualProvider } from '../../src/lib/integrations/providers/manual';
import { openRouterProvider } from '../../src/lib/integrations/providers/openrouter';
import { amazonSPAdapter } from '../../src/lib/integrations/providers/unavailable';
import type { Provider } from '../../src/lib/integrations/types';

interface ProviderStatus {
  name: string;
  displayName: string;
  available: boolean;
  isLive: boolean;
  requiresCredentials: boolean;
  credentialFields: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string; helpText?: string }>;
  reason?: string;
  message?: string;
}

function statusFor(provider: Provider): ProviderStatus {
  const config = getProviderConfig(provider);
  let unavailability: ReturnType<typeof manualProvider.checkAvailability> = null;

  switch (provider) {
    case 'manual':
      unavailability = manualProvider.checkAvailability();
      break;
    case 'openrouter':
      // No workspace credentials here — reports env-based availability only.
      unavailability = openRouterProvider.checkAvailability();
      break;
    case 'amazon-sp-api':
      unavailability = amazonSPAdapter.checkAvailability();
      break;
    default:
      unavailability = {
        available: false,
        provider,
        reason: 'not-implemented',
        message: `Provider ${provider} is not yet implemented. No data is available.`,
      };
  }

  return {
    name: config.name,
    displayName: config.displayName,
    available: unavailability === null,
    isLive: unavailability === null,
    requiresCredentials: config.requiresCredentials,
    credentialFields: config.credentialFields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      helpText: f.helpText,
    })),
    reason: unavailability?.reason,
    message: unavailability?.message,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`integration:status:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }

  try {
    const providers = getAllProviders().map(p => statusFor(p.name as Provider));

    return res.status(200).json({
      providers,
      current: CURRENT_PROVIDERS,
      future: FUTURE_PROVIDERS,
    });
  } catch (error) {
    console.error('Integration status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
