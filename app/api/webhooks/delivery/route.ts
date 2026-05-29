// app/api/webhooks/delivery/route.ts
// Africa's Talking posts delivery receipts here
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { parseDeliveryReceipt } from '@/lib/messaging/africastalking'

export async function POST(req: NextRequest) {
  const db = createServiceSupabase()
  const body = Object.fromEntries(await req.formData() as any)
  const receipt = parseDeliveryReceipt(body as Record<string, string>)

  const status = receipt.status === 'Success' || receipt.status === 'Delivered'
    ? 'delivered' : 'failed'

  await db.from('sends')
    .update({
      status,
      ...(status === 'delivered' && { delivered_at: new Date().toISOString() }),
      ...(status === 'failed'    && { error_message: receipt.failureReason }),
    })
    .eq('message_id', receipt.messageId)

  if (status === 'delivered') {
    // Get campaign_id from send and increment counter
    const { data: send } = await db
      .from('sends')
      .select('campaign_id')
      .eq('message_id', receipt.messageId)
      .single()

    if (send?.campaign_id) {
      await db.rpc('increment_campaign_delivered', { campaign_id_arg: send.campaign_id })
    }
  }

  return NextResponse.json({ ok: true })
}
