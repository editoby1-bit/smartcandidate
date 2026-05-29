// scripts/import-recipients.ts
// Import a CSV file of phone numbers into the recipients table
// Usage: npm run import -- --file=voters.csv --candidate=<uuid> [--dry-run]
//
// Expected CSV columns (case-insensitive, order doesn't matter):
//   phone, name, state, lga, ward, community, language, group

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { createServiceSupabase } from '@/lib/db/supabase'
import { normalisePhone } from '@/lib/utils/geography'

const BATCH_SIZE = 500

async function main() {
  const args = process.argv.slice(2)
  const fileArg    = args.find(a => a.startsWith('--file='))?.split('=')[1]
  const candidateArg = args.find(a => a.startsWith('--candidate='))?.split('=')[1]
  const dryRun     = args.includes('--dry-run')

  if (!fileArg || !candidateArg) {
    console.error('Usage: npm run import -- --file=voters.csv --candidate=<uuid> [--dry-run]')
    process.exit(1)
  }

  const filePath = path.resolve(fileArg)
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`\nSmartCandidate — Recipient Import`)
  console.log(`File:      ${filePath}`)
  console.log(`Candidate: ${candidateArg}`)
  console.log(`Dry run:   ${dryRun}`)
  console.log('─'.repeat(50))

  const raw = fs.readFileSync(filePath, 'utf8')
  const rows: Record<string, string>[] = parse(raw, {
    columns: (headers: string[]) => headers.map(h => h.toLowerCase().trim()),
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Rows in file: ${rows.length}`)

  let valid = 0, invalid = 0, duplicates = 0
  const toInsert: any[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const phone = normalisePhone(row.phone ?? row.mobile ?? row.number ?? '')
    if (!phone) { invalid++; continue }
    if (seen.has(phone)) { duplicates++; continue }
    seen.add(phone)

    const language = normaliseLanguage(row.language ?? 'english')

    toInsert.push({
      candidate_id: candidateArg,
      phone,
      name:       row.name       || null,
      state:      row.state      || null,
      lga:        row.lga        || null,
      ward:       row.ward       || null,
      community:  row.community  || null,
      language,
      group_tag:  row.group || row.group_tag || null,
    })
    valid++
  }

  console.log(`Valid:      ${valid}`)
  console.log(`Invalid:    ${invalid} (bad phone numbers)`)
  console.log(`Duplicates: ${duplicates} (within file)`)
  console.log('─'.repeat(50))

  if (dryRun) {
    console.log('Dry run — no data written.')
    console.log('Sample row:', toInsert[0])
    return
  }

  const db = createServiceSupabase()
  let inserted = 0, skipped = 0

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { data, error } = await db
      .from('recipients')
      .upsert(batch, {
        onConflict: 'candidate_id,phone',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error(`Batch ${Math.floor(i/BATCH_SIZE)+1} error:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\rImported: ${inserted}/${valid}...`)
    }
  }

  console.log(`\n✓ Import complete. ${inserted} records written.`)
}

function normaliseLanguage(lang: string): string {
  const lower = lang.toLowerCase()
  if (lower.includes('yoruba') || lower === 'yo') return 'yoruba'
  if (lower.includes('hausa')  || lower === 'ha') return 'hausa'
  if (lower.includes('igbo')   || lower === 'ig') return 'igbo'
  if (lower.includes('pidgin') || lower === 'pc') return 'pidgin'
  return 'english'
}

main().catch(err => { console.error(err); process.exit(1) })
