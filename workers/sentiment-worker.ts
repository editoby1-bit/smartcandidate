import { config } from 'dotenv'
config({ path: '.env.local' })

import { Worker } from 'bullmq'
import { createRedis, QUEUE_NAMES, type SentimentJobData } from '@/lib/messaging/queues'
import { scoreSentiment } from '@/lib/sentiment/scorer'
import { createServiceSupabase } from '@/lib/db/supabase'

const db         = createServiceSupabase()
const connection = createRedis()

console.log('[Sentiment Worker] Starting —', QUEUE_NAMES.SENTIMENT)

const worker = new Worker<SentimentJobData>(
  QUEUE_NAMES.SENTIMENT,
  async (job) => {
    const { response_id, text, candidate_id } = job.data
    const result = await scoreSentiment(text)

    await db.from('responses').update({
      sentiment:       result.sentiment,
      sentiment_score: result.score,
      topic:           result.topic,
    }).eq('id', response_id)

    if (result.isOptOut) {
      const { data: resp } = await db
        .from('responses')
        .select('recipient_id, channel')
        .eq('id', response_id)
        .single()

      if (resp?.recipient_id) {
        await db.from('recipients').update({
          opted_out:     true,
          opted_out_at:  new Date().toISOString(),
          opted_out_via: resp.channel + '_stop',
        }).eq('id', resp.recipient_id)
      }
    }

    console.log(`[Sentiment] ${response_id} → ${result.sentiment} topic:${result.topic}`)
  },
  { connection, concurrency: 5 }
)

worker.on('error', err => console.error('[Sentiment Worker]', err))
process.on('SIGTERM', async () => { await worker.close(); process.exit(0) })
