import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variables
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { productName, category, keyFeatures, targetAudience, tone, platform } = req.body;

    // Validate input
    if (!productName || productName.trim().length === 0) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    // Build the prompt based on platform and tone
    const platformInstructions = {
      amazon: 'Create an Amazon-optimized listing with a title (max 200 chars), 5 bullet points (max 500 chars each), and a product description (max 2000 chars). Include backend search terms.',
      etsy: 'Create an Etsy-optimized listing with a catchy title (max 140 chars), 5 bullet points highlighting uniqueness and craftsmanship, and a warm, personal description. Include relevant tags.',
      shopify: 'Create a Shopify-optimized listing with a compelling title, 5 benefit-focused bullet points, and a persuasive description. Include SEO meta description and keywords.',
    };

    const toneInstructions = {
      professional: 'Use a professional, authoritative tone. Focus on specifications and quality.',
      friendly: 'Use a warm, conversational tone. Focus on benefits and user experience.',
      luxury: 'Use an elegant, premium tone. Focus on exclusivity and superior quality.',
      urgent: 'Use an action-oriented, persuasive tone. Focus on limited availability and immediate benefits.',
    };

    const prompt = `You are an expert e-commerce copywriter. Create a complete product listing for the following product:

Product Name: ${productName}
Category: ${category || 'General'}
Key Features: ${keyFeatures || 'Not specified'}
Target Audience: ${targetAudience || 'General consumers'}

Platform: ${platform || 'amazon'}
${platformInstructions[platform as keyof typeof platformInstructions] || platformInstructions.amazon}

Tone: ${tone || 'professional'}
${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}

Please provide the output in this exact JSON format:
{
  "title": "Product title optimized for ${platform}",
  "bulletPoints": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"],
  "description": "Full product description",
  "searchTerms": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
}

Make sure the listing is:
- SEO optimized with relevant keywords
- Persuasive and conversion-focused
- Accurate to the product features provided
- Appropriate for the target audience
- Following ${platform} best practices and character limits`;

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://listingai-woad.vercel.app',
        'X-Title': 'NicheScout',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      return res.status(500).json({ error: 'Failed to generate listing' });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse the JSON response
    let listing;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        listing = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return raw content
      return res.status(200).json({
        title: productName,
        bulletPoints: ['AI generated content could not be parsed', 'Please try again'],
        description: content,
        searchTerms: [],
      });
    }

    return res.status(200).json(listing);

  } catch (error) {
    console.error('Error generating listing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
