// workers/wa-worker.ts
// Processes the WhatsApp send queue
// Run: npm run worker:wa
// Managed by PM2 in production

import { Worker } from 'bullmq'
import { createRedis, QUEUE_NAMES, type SendJobData } from '@/lib/messaging/queues'
import { sendWhatsApp } from '@/lib/messaging/africastalking'
import { createServiceSupabase } from '@/lib/db/supabase'

const db = createServiceSupabase()
const connection = createRedis()

console.log('[WA Worker] Starting — listening on queue:', QUEUE_NAMES.WHATSAPP)

const worker = new Worker<SendJobData>(
  QUEUE_NAMES.WHATSAPP,
  async (job) => {
    const { send_id, phone, message, campaign_id, media_url } = job.data

    // Mark as sending
    await db.from('sends').update({
      status: 'sending',
      attempted_at: new Date().toISOString(),
    }).eq('id', send_id)

    const result = await sendWhatsApp(phone, message, media_url)

    if (result.status === 'success') {
      await db.from('sends').update({
        status: 'sent',
        message_id: result.messageId,
      }).eq('id', send_id)

      // Increment campaign sent_count
      await db.rpc('increment_campaign_sent', { campaign_id_arg: campaign_id })

      console.log(`[WA] ✓ ${phone} — ${result.messageId}`)
    } else {
      await db.from('sends').update({
        status: 'failed',
        error_message: result.error,
      }).eq('id', send_id)

      await db.rpc('increment_campaign_failed', { campaign_id_arg: campaign_id })

      console.log(`[WA] ✗ ${phone} — ${result.error}`)
      throw new Error(result.error) // triggers retry
    }
  },
  {
    connection,
    concurrency: 10,        // 10 parallel sends
    limiter: {
      max: 80,              // max 80 per 10 seconds per sender
      duration: 10_000,
    },
  }
)

worker.on('failed', (job, err) => {
  console.error(`[WA] Job failed after retries: ${job?.id} — ${err.message}`)
})

worker.on('error', (err) => {
  console.error('[WA Worker] Error:', err)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WA Worker] Shutting down...')
  await worker.close()
  process.exit(0)
})
