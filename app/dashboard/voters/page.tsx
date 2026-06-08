'use client'
import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'

interface PreviewRow {
  phone: string; name: string; state: string; lga: string; ward: string
  language: string; status: 'valid' | 'invalid'; error?: string
}

function normalisePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('234') && d.length === 13) return '+' + d
  if (d.startsWith('0')   && d.length === 11) return '+234' + d.slice(1)
  if (d.length === 10) return '+234' + d
  return null
}

export default function VoterDatabasePage() {
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<PreviewRow[]>([])
  const [stats, setStats]         = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported]   = useState(false)
  const [error, setError]         = useState('')
  const [totalDB, setTotalDB]     = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/recipients?count=true')
      .then(r => r.json()).then(d => setTotalDB(d.count ?? 0)).catch(() => {})
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setImported(false); setStats(null); setError('')
    const text = await f.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { setError('File is empty or has no data rows'); return }
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const pi = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number'))
    const ni = headers.findIndex(h => h === 'name')
    const si = headers.findIndex(h => h === 'state')
    const li = headers.findIndex(h => h === 'lga')
    const wi = headers.findIndex(h => h === 'ward')
    const lgi = headers.findIndex(h => h.includes('lang'))
    if (pi === -1) { setError('No phone column. CSV must have "phone", "mobile", or "number" column'); return }
    const rows: PreviewRow[] = []
    const seen = new Set<string>()
    let valid = 0, invalid = 0, dups = 0
    for (let i = 1; i < Math.min(lines.length, 10001); i++) {
      const c = lines[i].split(',').map(x => x.trim().replace(/"/g, ''))
      const phone = normalisePhone(c[pi] ?? '')
      if (!phone) { rows.push({ phone: c[pi]??'', name:'', state:'', lga:'', ward:'', language:'', status:'invalid', error:'Invalid phone' }); invalid++; continue }
      if (seen.has(phone)) { dups++; continue }
      seen.add(phone)
      rows.push({ phone, name: ni>=0?c[ni]:'', state: si>=0?c[si]:'', lga: li>=0?c[li]:'', ward: wi>=0?c[wi]:'', language: lgi>=0?c[lgi]:'english', status:'valid' })
      valid++
    }
    setPreview(rows.slice(0, 20))
    setStats({ total: lines.length - 1, valid, invalid, duplicates: dups, inserted: 0 })
  }

  async function handleImport() {
    if (!file || !stats) return
    setImporting(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/recipients/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Import failed')
      else { setStats((p: any) => p ? { ...p, inserted: data.inserted } : p); setImported(true); setTotalDB(p => (p ?? 0) + data.inserted) }
    } catch { setError('Network error') }
    setImporting(false)
  }

  return (
    <div className="max-w-[1000px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Voter Database</div>
        <h1 className="font-serif text-3xl font-black text-white">Number <span className="text-[#C9A84C]">Bank</span></h1>
        <p className="text-sm text-white/40 mt-1">Upload phone numbers organised by state, LGA, and ward for precise targeting.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Numbers', value: totalDB !== null ? totalDB.toLocaleString() : '—', color: '#C9A84C', sub: 'In your database' },
          { label: 'Active', value: totalDB !== null ? totalDB.toLocaleString() : '—', color: '#1D9E75', sub: 'Available for campaigns' },
          { label: 'Opted Out', value: '0', color: '#4A90D9', sub: 'Removed from sends' },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-white/30">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Upload Phone Numbers</div>
        <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] rounded-lg p-3 mb-4">
          <div className="text-[10px] font-bold text-[#C9A84C]/70 uppercase tracking-widest mb-1">Required CSV Format</div>
          <div className="font-mono text-[11px] text-white/60 leading-relaxed">
            phone, name, state, lga, ward, language<br/>
            08012345678, Emeka Obi, Lagos, Alimosho, Ayobo, yoruba<br/>
            +2348023456789, Fatima Musa, Kano, Kano Municipal, Dala, hausa
          </div>
          <div className="text-[10px] text-white/30 mt-2">Only <strong className="text-white/60">phone</strong> is required. Accepted: 080XXXXXXXX · +234XXXXXXXXXX · 234XXXXXXXXXX</div>
        </div>

        <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file ? 'border-[#1D9E75]/50 bg-[#1D9E75]/5' : 'border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.04)]'}`}>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={24} className="text-[#1D9E75]" />
              <div><div className="text-[13px] font-semibold text-white">{file.name}</div><div className="text-[11px] text-white/40">{(file.size/1024).toFixed(0)} KB</div></div>
              <CheckCircle size={18} className="text-[#1D9E75]" />
            </div>
          ) : (
            <>
              <Upload size={28} className="text-[#C9A84C]/50 mx-auto mb-2" />
              <div className="text-[13px] font-semibold text-white/70">Click to upload CSV file</div>
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
                  <div className="text-[9px] text-white/35 uppercase tracking-wide mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-[rgba(201,168,76,0.12)]">
              <table className="w-full text-[11px]">
                <thead><tr className="border-b border-[rgba(201,168,76,0.1)]">{['Phone','Name','State','LGA','Ward','Language','Status'].map(h=><th key={h} className="text-left px-3 py-2 text-[8px] uppercase tracking-widest text-white/25 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map((row,i)=>(
                    <tr key={i} className={`border-b border-white/5 ${row.status==='invalid'?'bg-[#D85A30]/5':''}`}>
                      <td className="px-3 py-2 font-mono text-[#F2D98A]">{row.phone}</td>
                      <td className="px-3 py-2 text-white/70">{row.name||'—'}</td>
                      <td className="px-3 py-2 text-white/50">{row.state||'—'}</td>
                      <td className="px-3 py-2 text-white/50">{row.lga||'—'}</td>
                      <td className="px-3 py-2 text-white/50">{row.ward||'—'}</td>
                      <td className="px-3 py-2 text-white/50 capitalize">{row.language||'—'}</td>
                      <td className="px-3 py-2">{row.status==='valid'?<span className="pill pill-green">Valid</span>:<span className="pill pill-red">Invalid</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-white/40">{stats.valid.toLocaleString()} numbers will be imported.{stats.duplicates>0&&` ${stats.duplicates.toLocaleString()} duplicates skipped.`}</div>
              <button onClick={handleImport} disabled={importing||stats.valid===0} className="bg-[#C9A84C] text-black font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                {importing?'Importing…':`Import ${stats.valid.toLocaleString()} Numbers →`}
              </button>
            </div>
          </div>
        )}

        {imported && stats && (
          <div className="mt-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl p-4 text-center">
            <CheckCircle size={28} className="text-[#1D9E75] mx-auto mb-2"/>
            <div className="text-[14px] font-bold text-white mb-1">✓ {stats.inserted.toLocaleString()} numbers imported</div>
            <div className="text-[11px] text-white/40">Database now has {totalDB?.toLocaleString()} numbers ready for campaigns.</div>
            <button onClick={()=>{setFile(null);setStats(null);setImported(false);if(fileRef.current)fileRef.current.value=''}} className="mt-3 border border-[#1D9E75]/40 text-[#1D9E75] text-[11px] font-semibold px-4 py-2 rounded-lg hover:bg-[#1D9E75]/10 transition-all">Upload Another File</button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Download CSV Template</div>
        <p className="text-[12px] text-white/50 mb-3">Use this to format your existing number database before uploading.</p>
        <button onClick={()=>{const csv='phone,name,state,lga,ward,language,group\n08012345678,Sample Voter,Lagos,Alimosho,Ayobo,yoruba,\n08023456789,Another Voter,Kano,Kano Municipal,Dala,hausa,';const b=new Blob([csv],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='smartcandidate_template.csv';a.click()}} className="flex items-center gap-2 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] text-[12px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
          <Download size={14}/>Download Template CSV
        </button>
      </div>
    </div>
  )
}
