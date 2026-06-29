import { config } from 'dotenv'
config({ path: '.env.local' })

import { Worker } from 'bullmq'
import { createRedis, QUEUE_NAMES, type SendJobData } from '@/lib/messaging/queues'
import { sendSMS } from '@/lib/messaging/africastalking'
import { createServiceSupabase } from '@/lib/db/supabase'

const db         = createServiceSupabase()
const connection = createRedis()

console.log('[SMS Worker] Starting —', QUEUE_NAMES.SMS)

const worker = new Worker<SendJobData>(
  QUEUE_NAMES.SMS,
  async (job) => {
    const { send_id, phone, message, campaign_id } = job.data

    await db.from('sends').update({
      status: 'sending',
      attempted_at: new Date().toISOString(),
    }).eq('id', send_id)

    const result = await sendSMS(phone, message, process.env.AT_SENDER_ID)

    if (result.status === 'success') {
      await db.from('sends').update({
        status: 'sent',
        message_id: result.messageId,
      }).eq('id', send_id)
      await db.rpc('increment_campaign_sent', { campaign_id_arg: campaign_id })
      console.log(`[SMS] ✓ ${phone}`)
    } else {
      await db.from('sends').update({
        status: 'failed',
        error_message: result.error,
      }).eq('id', send_id)
      await db.rpc('increment_campaign_failed', { campaign_id_arg: campaign_id })
      throw new Error(result.error)
    }
  },
  {
    connection,
    concurrency: 50,
    limiter: { max: 500, duration: 10_000 },
  }
)

worker.on('error', err => console.error('[SMS Worker]', err))
process.on('SIGTERM', async () => { await worker.close(); process.exit(0) })
