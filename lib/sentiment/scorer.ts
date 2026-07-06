// lib/sentiment/scorer.ts
// Scores inbound voter responses using Claude Haiku
// Handles Nigerian English, Pidgin, Yoruba, Hausa, Igbo

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface SentimentResult {
  sentiment:  'positive' | 'negative' | 'neutral'
  score:      number  // 0-100
  topic:      string
  isOptOut:   boolean
  language:   string
}

export async function scoreSentiment(text: string): Promise<SentimentResult> {
  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Analyse this Nigerian voter message and respond with JSON only.

Message: "${text}"

Respond with exactly this JSON structure:
{
  "sentiment": "positive" or "negative" or "neutral",
  "score": number from 0 to 100 (100 = very positive),
  "topic": one of: infrastructure, security, economy, education, healthcare, water, electricity, jobs, opt_out, general,
  "isOptOut": true if message contains STOP, UNSUBSCRIBE, OPT OUT or similar,
  "language": one of: english, yoruba, hausa, igbo, pidgin
}

Only respond with the JSON object, nothing else.`
      }]
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      sentiment: parsed.sentiment ?? 'neutral',
      score:     typeof parsed.score === 'number' ? parsed.score : 50,
      topic:     parsed.topic ?? 'general',
      isOptOut:  parsed.isOptOut ?? false,
      language:  parsed.language ?? 'english',
    }
  } catch (err) {
    console.error('[Sentiment] Error:', err)
    // Fallback — check for opt-out keywords manually
    const lower = text.toLowerCase()
    const isOptOut = ['stop', 'unsubscribe', 'opt out', 'remove me', 'cancel'].some(w => lower.includes(w))
    return {
      sentiment: 'neutral',
      score:     50,
      topic:     'general',
      isOptOut,
      language:  'english',
    }
  }
}
