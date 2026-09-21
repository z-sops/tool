import type { Methodology, ProviderResponse, ListingGenerationInput, ListingGenerationResult } from '../types';
import type { ServerProvider, UnavailableResult } from './types';
import { unavailable } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenRouter provider — SERVER-SIDE ONLY.
 *
 * The API key is resolved from:
 *   1. workspace-level encrypted credentials (decrypted on the server), or
 *   2. the OPENROUTER_API_KEY environment variable.
 *
 * It is NEVER read from import.meta.env (VITE_*) — that would inline the key
 * into the browser bundle and expose it to every visitor. This module must
 * only be imported from serverless functions under api/.
 */
export class OpenRouterProvider implements ServerProvider {
  readonly name = 'openrouter' as const;
  readonly isLive = true;
  readonly methodology = 'api-live' as const;

  checkAvailability(credentials?: Record<string, string>): UnavailableResult | null {
    const apiKey = credentials?.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return unavailable(
        'openrouter',
        'credentials-missing',
        'OpenRouter API key not configured. Set OPENROUTER_API_KEY (server-side) or add workspace credentials.'
      );
    }
    return null;
  }

  /**
   * Perform a live listing generation call. Returns an attributed response
   * with methodology 'api-live' because a real OpenRouter API call was made.
   */
  async generateListing(
    input: ListingGenerationInput,
    credentials?: Record<string, string>
  ): Promise<ProviderResponse<ListingGenerationResult>> {
    const apiKey = credentials?.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const platformInstructions = {
      amazon: 'Create an Amazon-optimized listing with a title (max 200 chars), 5 bullet points (max 500 chars each), and a product description (max 2000 chars). Include backend search terms.',
      etsy: 'Create an Etsy-optimized listing with a catchy title (max 140 chars), 5 bullet points highlighting uniqueness and craftsmanship, and a warm, personal description. Include relevant tags.',
      shopify: 'Create a Shopify-optimized listing with a compelling title, 5 benefit-focused bullet points, and a persuasive description. Include SEO meta description and keywords.',
    } as const;

    const toneInstructions = {
      professional: 'Use a professional, authoritative tone. Focus on specifications and quality.',
      friendly: 'Use a warm, conversational tone. Focus on benefits and user experience.',
      luxury: 'Use an elegant, premium tone. Focus on exclusivity and superior quality.',
      urgent: 'Use an action-oriented, persuasive tone. Focus on limited availability and immediate benefits.',
    } as const;

    const prompt = `You are an expert e-commerce copywriter. Create a complete product listing for the following product:

Product Name: ${input.productName}
Category: ${input.category}
Key Features: ${input.keyFeatures.join(', ')}
Target Audience: ${input.targetAudience}

Platform: ${input.platform}
${platformInstructions[input.platform]}

Tone: ${input.tone}
${toneInstructions[input.tone]}

Please provide the output in this exact JSON format:
{
  "title": "Product title optimized for ${input.platform}",
  "bulletPoints": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"],
  "description": "Full product description",
  "searchTerms": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
}

Make sure the listing is:
- SEO optimized with relevant keywords
- Persuasive and conversion-focused
- Accurate to the product features provided
- Appropriate for the target audience
- Following ${input.platform} best practices and character limits`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://listing.ai',
        'X-Title': 'NicheScout',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      // Log only status — never headers or body, which could echo the key.
      throw new Error(`OpenRouter API error: HTTP ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content || '';

    let listing: ListingGenerationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      listing = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    return {
      data: listing,
      provider: 'openrouter',
      fetchedAt: new Date().toISOString(),
      confidence: 90,
      methodology: 'api-live',
    };
  }
}

export const openRouterProvider = new OpenRouterProvider();
