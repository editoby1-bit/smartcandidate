'use client'
// app/dashboard/voters/page.tsx
// ROLE-AWARE:
// - admin: sees upload, full stats, export button, number counts
// - analyst/other: sees geo breakdown only, NO phone numbers, NO export, NO upload

import { useState, useEffect, useRef } from 'react'
import { Upload, Download, FileText, CheckCircle, AlertCircle, Lock } from 'lucide-react'

interface GeoEntry { state?: string; lga?: string; count: number }

function normalisePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('234') && d.length === 13) return '+' + d
  if (d.startsWith('0')   && d.length === 11) return '+234' + d.slice(1)
  if (d.length === 10) return '+234' + d
  return null
}

export default function VoterDatabasePage() {
  const [role,       setRole]       = useState<string | null>(null)
  const [totalDB,    setTotalDB]    = useState<number | null>(null)
  const [byLGA,      setByLGA]      = useState<GeoEntry[]>([])
  const [byState,    setByState]    = useState<GeoEntry[]>([])
  const [file,       setFile]       = useState<File | null>(null)
  const [stats,      setStats]      = useState<any>(null)
  const [preview,    setPreview]    = useState<any[]>([])
  const [importing,  setImporting]  = useState(false)
  const [imported,   setImported]   = useState(false)
  const [error,      setError]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Get user role
    fetch('/api/analytics?type=dashboard')
      .then(r => r.json())
      .then(() => {})
      .catch(() => {})

    // Get current user role via candidate API
    fetch('/api/candidate')
      .then(r => r.json())
      .then(d => {
        // role comes from session — fetch from users
      })

    // Load recipient stats
    fetch('/api/recipients?count=true')
      .then(r => r.json())
      .then(d => {
        setTotalDB(d.count ?? 0)
        setByLGA(d.byLGA ?? [])
        setByState(d.byState ?? [])
        if (d.protected) setRole('analyst')
        else setRole('admin')
      })
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setImported(false); setStats(null); setError('')

    const text  = await f.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { setError('File is empty'); return }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))
    const pi = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number'))
    if (pi === -1) { setError('No phone column found'); return }

    const ni  = headers.findIndex(h => h === 'name')
    const si  = headers.findIndex(h => h === 'state')
    const li  = headers.findIndex(h => h === 'lga')
    const wi  = headers.findIndex(h => h === 'ward')

    const rows: any[] = []
    const seen = new Set<string>()
    let valid = 0, invalid = 0, dups = 0

    for (let i = 1; i < Math.min(lines.length, 10001); i++) {
      const c = lines[i].split(',').map(x => x.trim().replace(/"/g,''))
      const phone = normalisePhone(c[pi] ?? '')
      if (!phone) { invalid++; continue }
      if (seen.has(phone)) { dups++; continue }
      seen.add(phone)
      rows.push({ phone, name: ni>=0?c[ni]:'', state: si>=0?c[si]:'', lga: li>=0?c[li]:'', ward: wi>=0?c[wi]:'', status: 'valid' })
      valid++
    }

    setPreview(rows.slice(0, 15))
    setStats({ total: lines.length - 1, valid, invalid, duplicates: dups })
  }

  async function handleImport() {
    if (!file || !stats) return
    setImporting(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res  = await fetch('/api/recipients/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Import failed')
      else {
        setImported(true)
        setTotalDB(p => (p ?? 0) + data.inserted)
        // Reload geo stats
        fetch('/api/recipients?count=true').then(r=>r.json()).then(d=>{setByLGA(d.byLGA??[]);setByState(d.byState??[])})
      }
    } catch { setError('Network error') }
    setImporting(false)
  }

  const isAdmin   = role === 'admin'
  const isProtected = role === 'analyst' || byLGA.length > 0

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Voter Database</div>
        <h1 className="font-serif text-3xl font-black text-white">Number <span className="text-[#C9A84C]">Bank</span></h1>
        <p className="text-sm text-white/40 mt-1">
          {isAdmin
            ? 'Upload and manage voter phone numbers. Organised by state, LGA, and ward.'
            : 'View coverage by geography. Use Broadcast to reach voters by area.'}
        </p>
      </div>

      {/* Privacy notice for non-admin */}
      {!isAdmin && role !== null && (
        <div className="flex items-center gap-3 bg-[#4A90D9]/8 border border-[#4A90D9]/25 rounded-xl p-4">
          <Lock size={16} className="text-[#4A90D9] flex-shrink-0" />
          <div>
            <div className="text-[12px] font-semibold text-[#4A90D9] mb-0.5">Phone numbers are protected</div>
            <div className="text-[11px] text-white/50">
              You can see coverage counts and target by geography when creating campaigns. Individual phone numbers are not accessible from this account. Contact your administrator for access.
            </div>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Numbers',        value: totalDB !== null ? totalDB.toLocaleString() : '—', color: '#C9A84C', sub: 'In database' },
          { label: 'Active (not opted out)',value: totalDB !== null ? totalDB.toLocaleString() : '—', color: '#1D9E75', sub: 'Available for campaigns' },
          { label: 'Opted Out',             value: '0',                                                color: '#4A90D9', sub: 'Removed from sends' },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-white/30">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Geo breakdown — visible to everyone */}
      {byLGA.length > 0 && (
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
            Coverage by LGA
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {byLGA.slice(0, 20).map(l => {
              const pct = totalDB ? Math.round((l.count / totalDB) * 100) : 0
              return (
                <div key={l.lga} className="flex items-center gap-3">
                  <div className="text-[11px] text-white/65 w-32 flex-shrink-0 truncate">{l.lga}</div>
                  <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-[#F2D98A] w-16 text-right">{l.count.toLocaleString()}</div>
                </div>
              )
            })}
          </div>
          {!isAdmin && (
            <div className="mt-4 pt-3 border-t border-[rgba(201,168,76,0.1)] text-[11px] text-white/35 text-center">
              To send to any of these areas → go to <a href="/dashboard/broadcast" className="text-[#C9A84C]/70 hover:text-[#C9A84C]">Broadcast</a> → select the LGA or ward in targeting
            </div>
          )}
        </div>
      )}

      {/* Upload section — ADMIN ONLY */}
      {isAdmin && (
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Upload Phone Numbers</div>

          <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] rounded-lg p-3 mb-4">
            <div className="text-[10px] font-bold text-[#C9A84C]/70 uppercase tracking-widest mb-1">Required CSV Format</div>
            <div className="font-mono text-[11px] text-white/60 leading-relaxed">
              phone, name, state, lga, ward, language<br/>
              08012345678, Emeka Obi, Lagos, Alimosho, Ayobo, yoruba
            </div>
            <div className="text-[10px] text-white/30 mt-2">Only <strong className="text-white/60">phone</strong> is required. Formats: 080XXXXXXXX · +234XXXXXXXXXX · 234XXXXXXXXXX</div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-[#1D9E75]/50 bg-[#1D9E75]/5' : 'border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.04)]'}`}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={22} className="text-[#1D9E75]" />
                <div><div className="text-[13px] font-semibold text-white">{file.name}</div><div className="text-[11px] text-white/40">{(file.size/1024).toFixed(0)} KB</div></div>
                <CheckCircle size={18} className="text-[#1D9E75]" />
              </div>
            ) : (
              <>
                <Upload size={26} className="text-[#C9A84C]/50 mx-auto mb-2" />
                <div className="text-[13px] font-semibold text-white/70">Click to upload CSV</div>
                <div className="text-[11px] text-white/30 mt-1">.csv files only</div>
              </>
            )}
          </div>

          {error && <div className="mt-3 flex items-center gap-2 bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-[12px] text-[#D85A30]"><AlertCircle size={14}/>{error}</div>}

          {stats && !imported && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[{l:'Total',v:stats.total,c:'#C9A84C'},{l:'Valid',v:stats.valid,c:'#1D9E75'},{l:'Invalid',v:stats.invalid,c:'#D85A30'},{l:'Duplicates',v:stats.duplicates,c:'#4A90D9'}].map(s=>(
                  <div key={s.l} className="bg-[#1A1A1A] rounded-lg p-3 text-center border border-white/6">
                    <div className="font-serif text-xl font-bold" style={{color:s.c}}>{s.v.toLocaleString()}</div>
                    <div className="text-[9px] text-white/35 uppercase tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-[rgba(201,168,76,0.12)]">
                <table className="w-full text-[11px]">
                  <thead><tr className="border-b border-[rgba(201,168,76,0.1)]">{['Phone','Name','State','LGA','Ward'].map(h=><th key={h} className="text-left px-3 py-2 text-[8px] uppercase tracking-widest text-white/25 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.map((r,i)=>(
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2 font-mono text-[#F2D98A]">{r.phone}</td>
                        <td className="px-3 py-2 text-white/60">{r.name||'—'}</td>
                        <td className="px-3 py-2 text-white/50">{r.state||'—'}</td>
                        <td className="px-3 py-2 text-white/50">{r.lga||'—'}</td>
                        <td className="px-3 py-2 text-white/50">{r.ward||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-white/40">{stats.valid.toLocaleString()} numbers will be added to the database.</div>
                <button onClick={handleImport} disabled={importing||stats.valid===0} className="bg-[#C9A84C] text-black font-bold text-sm px-5 py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                  {importing ? 'Importing…' : `Import ${stats.valid.toLocaleString()} Numbers →`}
                </button>
              </div>
            </div>
          )}

          {imported && (
            <div className="mt-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl p-4 text-center">
              <CheckCircle size={26} className="text-[#1D9E75] mx-auto mb-2"/>
              <div className="text-[13px] font-bold text-white mb-1">Import complete</div>
              <div className="text-[11px] text-white/40">Database now has {totalDB?.toLocaleString()} numbers.</div>
              <button onClick={()=>{setFile(null);setStats(null);setImported(false);if(fileRef.current)fileRef.current.value=''}} className="mt-3 border border-[#1D9E75]/40 text-[#1D9E75] text-[11px] font-semibold px-4 py-1.5 rounded-lg hover:bg-[#1D9E75]/10 transition-all">Upload Another File</button>
            </div>
          )}
        </div>
      )}

      {/* Template download — admin only */}
      {isAdmin && (
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Templates</div>
          <div className="flex gap-3">
            <button
              onClick={()=>{const csv='phone,name,state,lga,ward,language,group\n08012345678,Sample Voter,Lagos,Alimosho,Ayobo,yoruba,';const b=new Blob([csv],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='smartcandidate_template.csv';a.click()}}
              className="flex items-center gap-2 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all"
            >
              <Download size={13}/>Download Upload Template
            </button>
            <button
              onClick={()=>window.open('/api/recipients/export','_blank')}
              className="flex items-center gap-2 border border-white/10 text-white/40 text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              <Download size={13}/>Export Database (Admin)
            </button>
          </div>
          <div className="text-[10px] text-white/20 mt-2">Export is restricted to admin accounts only. Campaign managers and analysts cannot download phone numbers.</div>
        </div>
      )}
    </div>
  )
}
