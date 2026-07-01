import { config } from 'dotenv'
config({ path: '.env.local' })

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { sendSMS } from '@/lib/messaging/africastalking'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('campaigns').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { action } = body

  const { data: campaign } = await svcDb
    .from('campaigns').select('*').eq('id', params.id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (action === 'launch') {
    // Build recipient query
    let query = svcDb
      .from('recipients')
      .select('id, phone, name, lga, ward')
      .eq('candidate_id', campaign.candidate_id)
      .eq('opted_out', false)

    if (campaign.target_state)    query = query.eq('state',    campaign.target_state)
    if (campaign.target_lga)      query = query.eq('lga',      campaign.target_lga)
    if (campaign.target_ward)     query = query.eq('ward',     campaign.target_ward)
    if (campaign.target_language) query = query.eq('language', campaign.target_language)

    const { data: recipients } = await query
    if (!recipients?.length) {
      return NextResponse.json({ error: 'No eligible recipients found for this targeting' }, { status: 400 })
    }

    // Mark campaign as running immediately
    await svcDb.from('campaigns').update({
      status:        'running',
      launched_at:   new Date().toISOString(),
      total_targets: recipients.length,
    }).eq('id', campaign.id)

    // Send directly — no Redis queue needed
    ;(async () => {
      let sent = 0, failed = 0

      for (const r of recipients) {
        const message = (campaign.message_body || '')
          .replace(/\{name\}/g,  r.name  ?? 'Valued Voter')
          .replace(/\{lga\}/g,   r.lga   ?? '')
          .replace(/\{ward\}/g,  r.ward  ?? '')

        try {
          const result = await sendSMS(
            r.phone,
            message,
            process.env.AT_SENDER_ID ?? 'SMARTCAND'
          )

          if (result.status === 'success') {
            sent++
            await svcDb.from('sends').insert({
              campaign_id:  campaign.id,
              recipient_id: r.id,
              channel:      'sms',
              status:       'sent',
              message_id:   result.messageId ?? null,
              attempted_at: new Date().toISOString(),
            })
            console.log(`[SMS] ✓ ${r.phone}`)
          } else {
            failed++
            console.log(`[SMS] ✗ ${r.phone} — ${result.error}`)
          }
        } catch (err: any) {
          failed++
          console.error(`[SMS] Error ${r.phone}:`, err.message)
        }

        // Small delay between sends
        await new Promise(res => setTimeout(res, 200))

        // Update progress every 10 sends
        if ((sent + failed) % 10 === 0) {
          await svcDb.from('campaigns')
            .update({ sent_count: sent, failed_count: failed })
            .eq('id', campaign.id)
        }
      }

      // Final update
      await svcDb.from('campaigns').update({
        status:       sent > 0 ? 'completed' : 'failed',
        sent_count:   sent,
        failed_count: failed,
        completed_at: new Date().toISOString(),
      }).eq('id', campaign.id)

      console.log(`[Campaign] ${campaign.id} done — ${sent} sent, ${failed} failed`)
    })()

    return NextResponse.json({
      success: true,
      queued:  recipients.length,
      message: `Sending to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`,
    })
  }

  if (action === 'pause') {
    await svcDb.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'cancel') {
    await svcDb.from('campaigns').update({ status: 'cancelled' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
