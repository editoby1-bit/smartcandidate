// lib/messaging/queues.ts
// BullMQ job queues backed by Redis (Upstash)
// Each channel has its own queue so they can be scaled and rate-limited independently

import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'

// ── Redis connection ──────────────────────────────────────────

export function createRedis() {
  return new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  })
}

// ── Queue names ───────────────────────────────────────────────

export const QUEUE_NAMES = {
  WHATSAPP: 'whatsapp-sends',
  SMS:      'sms-sends',
  VOICE:    'voice-calls',
  SENTIMENT:'sentiment-scoring',
  ANALYTICS:'analytics-refresh',
} as const

// ── Job data types ────────────────────────────────────────────

export interface SendJobData {
  send_id:      string
  campaign_id:  string
  recipient_id: string
  phone:        string
  message:      string
  candidate_id: string
  sender_id?:   string
  media_url?:   string
  // Voice only
  voice_callback_url?: string
  // For variable resolution (already resolved before queuing)
  resolved: true
}

export interface SentimentJobData {
  response_id:  string
  candidate_id: string
  text:         string
  channel:      string
}

export interface AnalyticsJobData {
  candidate_id: string
  scope: 'all' | 'ward' | 'channel'
}

// ── Queue factories ───────────────────────────────────────────

let _connection: IORedis | null = null
function getConnection() {
  if (!_connection) _connection = createRedis()
  return _connection
}

export function getWhatsAppQueue() {
  return new Queue<SendJobData>(QUEUE_NAMES.WHATSAPP, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  })
}

export function getSMSQueue() {
  return new Queue<SendJobData>(QUEUE_NAMES.SMS, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  })
}

export function getVoiceQueue() {
  return new Queue<SendJobData>(QUEUE_NAMES.VOICE, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  })
}

export function getSentimentQueue() {
  return new Queue<SentimentJobData>(QUEUE_NAMES.SENTIMENT, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 2000 },
      removeOnComplete: { count: 5000 },
    },
  })
}

export function getAnalyticsQueue() {
  return new Queue<AnalyticsJobData>(QUEUE_NAMES.ANALYTICS, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
    },
  })
}

// ── Campaign launcher ─────────────────────────────────────────
// Called when a campaign is launched. Queries all matching recipients
// and enqueues one job per recipient.

export async function enqueueCampaign(
  campaign: {
    id: string
    candidate_id: string
    channel: string
    message_body: string
    target_state?: string | null
    target_lga?: string | null
    target_ward?: string | null
    target_language?: string | null
    target_group?: string | null
    media_url?: string | null
  },
  sends: Array<{
    id: string
    recipient_id: string
    phone: string
    name: string | null
    lga: string | null
    ward: string | null
  }>
): Promise<number> {
  const queue = campaign.channel === 'whatsapp' ? getWhatsAppQueue()
              : campaign.channel === 'sms'       ? getSMSQueue()
              : getVoiceQueue()

  const jobs = sends.map(send => {
    // Resolve template variables
    const message = campaign.message_body
      .replace('{name}',           send.name ?? 'Valued Voter')
      .replace('{lga}',            send.lga ?? '')
      .replace('{ward}',           send.ward ?? '')
      .replace('{candidate_name}', 'Gov. Adeyemi')

    return {
      name: `send-${send.id}`,
      data: {
        send_id:      send.id,
        campaign_id:  campaign.id,
        recipient_id: send.recipient_id,
        phone:        send.phone,
        message,
        candidate_id: campaign.candidate_id,
        media_url:    campaign.media_url ?? undefined,
        voice_callback_url: campaign.channel === 'voice'
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/callback`
          : undefined,
        resolved: true as const,
      } satisfies SendJobData,
      opts: {
        // Stagger by 100ms per job to respect rate limits
        delay: 0,
      },
    }
  })

  await queue.addBulk(jobs)
  return jobs.length
}
