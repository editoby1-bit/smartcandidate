// lib/sentiment/scorer.ts
// Scores inbound voter responses using OpenAI GPT-4o-mini
// Fast, cheap (~$0.00015 / 1K tokens), handles Nigerian English and Pidgin

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number  // 0.0 (very negative) to 1.0 (very positive)
  topic: string  // 'infrastructure' | 'security' | 'economy' | 'education' | 'healthcare' | 'water' | 'jobs' | 'general'
  isOptOut: boolean
  confidence: number
}

const SYSTEM_PROMPT = `You are a political sentiment analyser for Nigerian elections.
Classify voter messages and extract topics. Handle Nigerian English, Pidgin English, Yoruba, Hausa, and Igbo mixed with English.

Respond ONLY with valid JSON — no other text.

Format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": 0.0-1.0,
  "topic": "infrastructure" | "security" | "economy" | "education" | "healthcare" | "water" | "electricity" | "jobs" | "general",
  "isOptOut": true | false,
  "confidence": 0.0-1.0
}

Rules:
- score 0.0 = very negative, 0.5 = neutral, 1.0 = very positive
- isOptOut = true if they say STOP, UNSUBSCRIBE, REMOVE ME, or similar
- topic should be the PRIMARY issue mentioned
- If they press a DTMF key (1, 2, 3, 4), treat "1" as positive support, "2" as neutral info request, "3" as engagement, "4+" as negative or other
- Common Nigerian phrases: "e don do" (it's done/enough - could be positive or negative depending on context), "make e better" (improve), "na lie" (that's a lie - negative)
`

export async function scoreSentiment(text: string): Promise<SentimentResult> {
  // Handle DTMF responses quickly without API call
  if (/^[1-4]$/.test(text.trim())) {
    return scoreDTMF(text.trim())
  }

  // Handle obvious opt-outs without API call
  const lower = text.toLowerCase().trim()
  if (/^(stop|unsubscribe|remove|opt.?out|no more|stop message)/.test(lower)) {
    return {
      sentiment: 'negative',
      score: 0.1,
      topic: 'general',
      isOptOut: true,
      confidence: 1.0
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 150,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Classify this voter message: "${text}"` }
      ]
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw)

    return {
      sentiment: parsed.sentiment ?? 'neutral',
      score: clamp(Number(parsed.score ?? 0.5), 0, 1),
      topic: parsed.topic ?? 'general',
      isOptOut: Boolean(parsed.isOptOut),
      confidence: clamp(Number(parsed.confidence ?? 0.8), 0, 1),
    }
  } catch {
    // Fallback: simple keyword scoring
    return keywordFallback(text)
  }
}

function scoreDTMF(key: string): SentimentResult {
  const map: Record<string, SentimentResult> = {
    '1': { sentiment: 'positive', score: 0.9, topic: 'general', isOptOut: false, confidence: 0.95 },
    '2': { sentiment: 'neutral',  score: 0.5, topic: 'general', isOptOut: false, confidence: 0.95 },
    '3': { sentiment: 'positive', score: 0.7, topic: 'general', isOptOut: false, confidence: 0.95 },
    '4': { sentiment: 'negative', score: 0.2, topic: 'general', isOptOut: false, confidence: 0.95 },
  }
  return map[key] ?? { sentiment: 'neutral', score: 0.5, topic: 'general', isOptOut: false, confidence: 0.7 }
}

function keywordFallback(text: string): SentimentResult {
  const lower = text.toLowerCase()

  const positiveWords = ['good','great','excellent','thank','support','vote','continue','happy','yes','agree','wonderful','better','improve','progress','nice','love','best','champion']
  const negativeWords = ['bad','terrible','fail','corrupt','disappointed','no','never','rubbish','useless','nothing','worse','liar','thief','stop','enough','remove','change']
  const optOutWords = ['stop','unsubscribe','remove','opt out','no more']

  const isOptOut = optOutWords.some(w => lower.includes(w))
  const posScore = positiveWords.filter(w => lower.includes(w)).length
  const negScore = negativeWords.filter(w => lower.includes(w)).length

  let sentiment: 'positive' | 'neutral' | 'negative'
  let score: number

  if (posScore > negScore) { sentiment = 'positive'; score = 0.65 + Math.min(posScore * 0.05, 0.3) }
  else if (negScore > posScore) { sentiment = 'negative'; score = 0.35 - Math.min(negScore * 0.05, 0.3) }
  else { sentiment = 'neutral'; score = 0.5 }

  // Topic detection
  let topic = 'general'
  if (/road|bridge|construction|infrastructure/.test(lower)) topic = 'infrastructure'
  else if (/security|police|crime|safe/.test(lower)) topic = 'security'
  else if (/job|employ|business|economy|money|naira/.test(lower)) topic = 'economy'
  else if (/school|education|student|teacher/.test(lower)) topic = 'education'
  else if (/hospital|health|doctor|sick|medicine/.test(lower)) topic = 'healthcare'
  else if (/water|tap|borehole|pipe/.test(lower)) topic = 'water'
  else if (/light|nepa|ekedc|electricity|power/.test(lower)) topic = 'electricity'

  return { sentiment, score: clamp(score, 0, 1), topic, isOptOut, confidence: 0.6 }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

// ── Batch scoring ─────────────────────────────────────────────
// Score multiple responses in parallel (max 10 concurrent)

export async function batchScore(
  items: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; result: SentimentResult }>> {
  const BATCH_SIZE = 10
  const results: Array<{ id: string; result: SentimentResult }> = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const scored = await Promise.all(
      batch.map(async item => ({
        id: item.id,
        result: await scoreSentiment(item.text)
      }))
    )
    results.push(...scored)
  }

  return results
}
