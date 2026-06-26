import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Quote Drafting ───────────────────────────────────────────────────────────
export async function draftQuoteFromDescription(opts: {
  description: string
  orgName: string
  industry: string
  catalogItems?: { name: string; price: number; unit: string }[]
  historicalPrices?: { name: string; avgPrice: number }[]
  currency?: string
}): Promise<{
  title: string
  introText: string
  lineItems: { name: string; description: string; quantity: number; unitPrice: number; unit: string }[]
  termsText: string
}> {
  const catalogContext = opts.catalogItems?.length
    ? `\nAvailable catalog items:\n${opts.catalogItems.map(i => `- ${i.name}: ${i.price} per ${i.unit}`).join('\n')}`
    : ''

  const histContext = opts.historicalPrices?.length
    ? `\nHistorical average prices:\n${opts.historicalPrices.map(i => `- ${i.name}: ${i.avgPrice}`).join('\n')}`
    : ''

  const prompt = `You are a professional quotation assistant for ${opts.orgName}, a ${opts.industry} business.

Generate a complete quote draft based on this description:
"${opts.description}"
${catalogContext}${histContext}

Respond with valid JSON matching this exact structure:
{
  "title": "Quote title",
  "introText": "Professional introduction paragraph",
  "lineItems": [
    { "name": "Item name", "description": "Brief description", "quantity": 1, "unitPrice": 0, "unit": "unit" }
  ],
  "termsText": "Standard terms and conditions paragraph relevant to the work"
}

Use ${opts.currency ?? 'USD'} for prices. Be specific and professional. Match prices to catalog/historical data if available.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 2000,
  })

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return {
      title: 'New Quote',
      introText: 'Thank you for the opportunity to provide this quote.',
      lineItems: [],
      termsText: 'Standard terms apply.',
    }
  }
}

// ─── Product Recommendations ──────────────────────────────────────────────────
export async function getProductRecommendations(opts: {
  currentItems: string[]
  industry: string
  catalogItems: { id: string; name: string; category: string }[]
  clientProfile?: string
}): Promise<string[]> {
  const prompt = `You are a product recommendation engine for a ${opts.industry} business.

Current quote items: ${opts.currentItems.join(', ')}
Available catalog: ${opts.catalogItems.map(i => i.name).join(', ')}
${opts.clientProfile ? `Client profile: ${opts.clientProfile}` : ''}

Recommend up to 3 catalog item names that would naturally complement the current items. Return JSON: {"recommendations": ["name1", "name2"]}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 200,
  })

  try {
    const result = JSON.parse(response.choices[0].message.content ?? '{}')
    return result.recommendations ?? []
  } catch {
    return []
  }
}

// ─── Follow-up Email Draft ────────────────────────────────────────────────────
export async function draftFollowUpEmail(opts: {
  clientName: string
  orgName: string
  quoteTitle: string
  quoteNumber: string
  daysSinceSent: number
  totalAmount: string
}): Promise<{ subject: string; body: string }> {
  const prompt = `Draft a professional, warm follow-up email for a quote that was sent ${opts.daysSinceSent} days ago but not yet viewed.

Context:
- Sender: ${opts.orgName}
- Client: ${opts.clientName}
- Quote: ${opts.quoteNumber} — ${opts.quoteTitle}
- Amount: ${opts.totalAmount}

Write a concise, friendly follow-up (3-4 sentences max). Not pushy. Return JSON: {"subject": "...", "body": "..."}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 300,
  })

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return {
      subject: `Following up on ${opts.quoteNumber}`,
      body: `Hi ${opts.clientName}, just wanted to check if you had a chance to review the quote I sent a few days ago.`,
    }
  }
}

// ─── Terms & Conditions Generator ────────────────────────────────────────────
export async function generateTermsAndConditions(opts: {
  industry: string
  orgName: string
  country: string
  quoteItems: string[]
}): Promise<string> {
  const prompt = `Generate professional terms and conditions for a ${opts.industry} business called ${opts.orgName} in ${opts.country}.

The quote covers: ${opts.quoteItems.join(', ')}

Write 4-6 concise clauses covering: payment terms, delivery, cancellation, warranty/liability, and IP/ownership (if relevant). Plain professional English.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
  })

  return response.choices[0].message.content ?? ''
}

// ─── Win/Loss Analysis ────────────────────────────────────────────────────────
export async function analyzeWinLossPatterns(opts: {
  wonQuotes: { industry: string; value: number; items: string[]; clientType: string; daysToClose: number }[]
  lostQuotes: { industry: string; value: number; items: string[]; clientType: string; reason?: string }[]
}): Promise<{
  insights: string[]
  recommendations: string[]
  bestPerformingItems: string[]
  optimalPriceRange: { min: number; max: number }
}> {
  const prompt = `Analyze these quote win/loss patterns and provide actionable insights.

Won quotes (${opts.wonQuotes.length}): ${JSON.stringify(opts.wonQuotes.slice(0, 20))}
Lost quotes (${opts.lostQuotes.length}): ${JSON.stringify(opts.lostQuotes.slice(0, 20))}

Return JSON with: {"insights": ["..."], "recommendations": ["..."], "bestPerformingItems": ["..."], "optimalPriceRange": {"min": 0, "max": 0}}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
  })

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return { insights: [], recommendations: [], bestPerformingItems: [], optimalPriceRange: { min: 0, max: 999999 } }
  }
}

// ─── Sentiment Analysis ───────────────────────────────────────────────────────
export async function analyzeCommentSentiment(text: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  score: number // -1 to 1
  summary: string
  requiresImmediateAttention: boolean
}> {
  const prompt = `Analyze the sentiment of this client message: "${text}"
Return JSON: {"sentiment": "positive|neutral|negative|urgent", "score": 0.0, "summary": "...", "requiresImmediateAttention": false}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 150,
  })

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return { sentiment: 'neutral', score: 0, summary: text, requiresImmediateAttention: false }
  }
}

// ─── Translation ──────────────────────────────────────────────────────────────
export async function translateQuoteContent(opts: {
  content: Record<string, string>
  targetLanguage: string
  targetLocale: string
}): Promise<Record<string, string>> {
  const prompt = `Translate this professional business quote content to ${opts.targetLanguage} (locale: ${opts.targetLocale}).
Maintain professional tone. Input JSON: ${JSON.stringify(opts.content)}
Return same JSON structure with translated values.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2000,
  })

  try {
    return JSON.parse(response.choices[0].message.content ?? '{}')
  } catch {
    return opts.content
  }
}
