'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Download, FileText, CheckCircle, AlertCircle, ClipboardPaste, Lock } from 'lucide-react'
import { getStates, getLGAs, getWards } from '@/lib/utils/geography'

function normalisePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('234') && d.length === 13) return '+' + d
  if (d.startsWith('0')   && d.length === 11) return '+234' + d.slice(1)
  if (d.length === 10) return '+234' + d
  return null
}

export default function VoterDatabasePage() {
  const [mode,        setMode]        = useState<'csv'|'paste'>('csv')
  const [role,        setRole]        = useState<string>('admin')
  const [totalDB,     setTotalDB]     = useState<number|null>(null)
  const [byLGA,       setByLGA]       = useState<{lga:string;count:number}[]>([])
  const [file,        setFile]        = useState<File|null>(null)
  const [preview,     setPreview]     = useState<any[]>([])
  const [csvStats,    setCsvStats]    = useState<any>(null)
  const [importing,   setImporting]   = useState(false)
  const [imported,    setImported]    = useState(false)
  const [error,       setError]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [pasteText,   setPasteText]   = useState('')
  const [pasteState,  setPasteState]  = useState('')
  const [pasteLGA,    setPasteLGA]    = useState('')
  const [pasteWard,   setPasteWard]   = useState('')
  const [pasteLang,   setPasteLang]   = useState('english')
  const [pasting,     setPasting]     = useState(false)
  const [pasteResult, setPasteResult] = useState<any>(null)

  const states = getStates()
  const lgas   = pasteState ? getLGAs(pasteState) : []
  const wards  = (pasteState && pasteLGA) ? getWards(pasteState, pasteLGA) : []

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const res  = await fetch('/api/recipients?count=true')
    const data = await res.json()
    setTotalDB(data.count ?? 0)
    setByLGA(data.byLGA ?? [])
    if (data.protected) setRole('analyst')
    else setRole('admin')
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setImported(false); setCsvStats(null); setError('')
    const text    = await f.text()
    const lines   = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) { setError('File is empty'); return }
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))
    const pi = headers.findIndex(h => h.includes('phone')||h.includes('mobile')||h.includes('number'))
    if (pi === -1) { setError('No phone column found'); return }
    const ni=headers.findIndex(h=>h==='name'), si=headers.findIndex(h=>h==='state')
    const li=headers.findIndex(h=>h==='lga'),  wi=headers.findIndex(h=>h==='ward')
    const rows: any[] = []; const seen = new Set<string>()
    let valid=0,invalid=0,dups=0
    for (let i=1;i<Math.min(lines.length,10001);i++) {
      const c = lines[i].split(',').map(x=>x.trim().replace(/"/g,''))
      const phone = normalisePhone(c[pi]??'')
      if (!phone) { invalid++; continue }
      if (seen.has(phone)) { dups++; continue }
      seen.add(phone)
      rows.push({phone,name:ni>=0?c[ni]:'',state:si>=0?c[si]:'',lga:li>=0?c[li]:'',ward:wi>=0?c[wi]:'',status:'valid'})
      valid++
    }
    setPreview(rows.slice(0,15))
    setCsvStats({total:lines.length-1,valid,invalid,duplicates:dups})
  }

  async function handleCSVImport() {
    if (!file||!csvStats) return
    setImporting(true); setError('')
    const fd = new FormData(); fd.append('file',file)
    try {
      const res=await fetch('/api/recipients/import',{method:'POST',body:fd})
      const data=await res.json()
      if (!res.ok) setError(data.error??'Import failed')
      else { setImported(true); setTotalDB(p=>(p??0)+data.inserted); loadStats() }
    } catch { setError('Network error') }
    setImporting(false)
  }

  async function handlePasteImport() {
    if (!pasteText.trim()) return
    setPasting(true); setPasteResult(null)
    try {
      const res=await fetch('/api/recipients/bulk-paste',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({raw_text:pasteText,state:pasteState||null,lga:pasteLGA||null,ward:pasteWard||null,language:pasteLang})
      })
      const data=await res.json()
      setPasteResult(data)
      if (data.inserted>0) { setTotalDB(p=>(p??0)+data.inserted); loadStats() }
    } catch { setPasteResult({error:'Network error'}) }
    setPasting(false)
  }

  const isAdmin = role==='admin'
  const detectedCount = pasteText ? pasteText.split(/[\s,;|\n]+/).filter(t=>t.replace(/\D/g,'').length>=7).length : 0

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Voter Database</div>
        <h1 className="font-serif text-3xl font-black text-white">Number <span className="text-[#C9A84C]">Bank</span></h1>
        <p className="text-sm text-white/40 mt-1">Upload and manage voter phone numbers. Organised by state, LGA, and ward.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {label:'Total Numbers',value:totalDB!==null?totalDB.toLocaleString():'—',color:'#C9A84C',sub:'In database'},
          {label:'Active',value:totalDB!==null?totalDB.toLocaleString():'—',color:'#1D9E75',sub:'Available'},
          {label:'Opted Out',value:'0',color:'#4A90D9',sub:'Removed'},
        ].map(c=>(
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,${c.color},transparent)`}}/>
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold" style={{color:c.color}}>{c.value}</div>
            <div className="text-[10px] text-white/30">{c.sub}</div>
          </div>
        ))}
      </div>

      {byLGA.length>0 && (
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Coverage by LGA</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {byLGA.slice(0,20).map(l=>{
              const pct=totalDB?Math.round((l.count/totalDB)*100):0
              return (
                <div key={l.lga} className="flex items-center gap-3">
                  <div className="text-[11px] text-white/65 w-32 flex-shrink-0 truncate">{l.lga||'Unmapped'}</div>
                  <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden"><div className="h-full bg-[#C9A84C] rounded-full" style={{width:`${pct}%`}}/></div>
                  <div className="text-[10px] font-mono text-[#F2D98A] w-16 text-right">{l.count.toLocaleString()}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="flex items-center gap-3 bg-[#4A90D9]/8 border border-[#4A90D9]/25 rounded-xl p-4">
          <Lock size={16} className="text-[#4A90D9] flex-shrink-0"/>
          <div>
            <div className="text-[12px] font-semibold text-[#4A90D9] mb-0.5">Phone numbers are protected</div>
            <div className="text-[11px] text-white/50">Coverage counts visible. Numbers not accessible. Use Broadcast to target by geography.</div>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="flex gap-2">
            {[{key:'csv',label:'📄 CSV Upload',desc:'Formatted spreadsheet with headers'},{key:'paste',label:'📋 Paste & Tag',desc:'Raw numbers — select geography first'}].map(m=>(
              <button key={m.key} onClick={()=>setMode(m.key as any)}
                className={`flex-1 p-3 rounded-xl border text-left transition-all ${mode===m.key?'border-[#C9A84C] bg-[rgba(201,168,76,0.08)]':'border-white/8 bg-[#141414] hover:border-white/20'}`}>
                <div className="text-[13px] font-semibold text-white">{m.label}</div>
                <div className="text-[11px] text-white/40">{m.desc}</div>
              </button>
            ))}
          </div>

          {mode==='csv' && (
            <div className="card">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">CSV Upload</div>
              <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] rounded-lg p-3 mb-4 font-mono text-[11px] text-white/60 leading-relaxed">
                phone, name, state, lga, ward, language<br/>08012345678, Emeka Obi, Lagos, Alimosho, Ayobo, yoruba
              </div>
              <div onClick={()=>fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file?'border-[#1D9E75]/50 bg-[#1D9E75]/5':'border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)]'}`}>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect}/>
                {file?(
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={22} className="text-[#1D9E75]"/>
                    <div><div className="text-[13px] font-semibold text-white">{file.name}</div><div className="text-[11px] text-white/40">{(file.size/1024).toFixed(0)} KB</div></div>
                    <CheckCircle size={18} className="text-[#1D9E75]"/>
                  </div>
                ):(
                  <><Upload size={26} className="text-[#C9A84C]/50 mx-auto mb-2"/>
                  <div className="text-[13px] font-semibold text-white/70">Click to upload CSV</div>
                  <div className="text-[11px] text-white/30 mt-1">.csv files only</div></>
                )}
              </div>
              {error && <div className="mt-3 flex items-center gap-2 bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-[12px] text-[#D85A30]"><AlertCircle size={14}/>{error}</div>}
              {csvStats&&!imported&&(
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[{l:'Total',v:csvStats.total,c:'#C9A84C'},{l:'Valid',v:csvStats.valid,c:'#1D9E75'},{l:'Invalid',v:csvStats.invalid,c:'#D85A30'},{l:'Dups',v:csvStats.duplicates,c:'#4A90D9'}].map(s=>(
                      <div key={s.l} className="bg-[#1A1A1A] rounded-lg p-3 text-center border border-white/6">
                        <div className="font-serif text-xl font-bold" style={{color:s.c}}>{s.v.toLocaleString()}</div>
                        <div className="text-[9px] text-white/35 uppercase">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-[rgba(201,168,76,0.12)]">
                    <table className="w-full text-[11px]">
                      <thead><tr className="border-b border-[rgba(201,168,76,0.1)]">{['Phone','Name','State','LGA','Ward'].map(h=><th key={h} className="text-left px-3 py-2 text-[8px] uppercase tracking-widest text-white/25">{h}</th>)}</tr></thead>
                      <tbody>{preview.map((r,i)=><tr key={i} className="border-b border-white/5"><td className="px-3 py-2 font-mono text-[#F2D98A]">{r.phone}</td><td className="px-3 py-2 text-white/60">{r.name||'—'}</td><td className="px-3 py-2 text-white/50">{r.state||'—'}</td><td className="px-3 py-2 text-white/50">{r.lga||'—'}</td><td className="px-3 py-2 text-white/50">{r.ward||'—'}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-white/40">{csvStats.valid.toLocaleString()} numbers will be imported.</div>
                    <button onClick={handleCSVImport} disabled={importing||csvStats.valid===0} className="bg-[#C9A84C] text-black font-bold text-sm px-5 py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                      {importing?'Importing…':`Import ${csvStats.valid.toLocaleString()} →`}
                    </button>
                  </div>
                </div>
              )}
              {imported&&<div className="mt-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl p-4 text-center"><CheckCircle size={26} className="text-[#1D9E75] mx-auto mb-2"/><div className="text-[13px] font-bold text-white">Import complete — {totalDB?.toLocaleString()} total</div></div>}
            </div>
          )}

          {mode==='paste' && (
            <div className="card">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Paste & Tag</div>
              <p className="text-[12px] text-white/50 mb-4">Select the geography, then paste numbers in any format. Commas, newlines, spaces — all accepted. System normalises everything automatically.</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">State</label>
                  <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                    value={pasteState} onChange={e=>{setPasteState(e.target.value);setPasteLGA('');setPasteWard('')}}>
                    <option value="">— Unmapped —</option>
                    {states.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">LGA</label>
                  <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-40"
                    value={pasteLGA} onChange={e=>{setPasteLGA(e.target.value);setPasteWard('')}} disabled={!pasteState}>
                    <option value="">— Unmapped —</option>
                    {lgas.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Ward</label>
                  <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-40"
                    value={pasteWard} onChange={e=>setPasteWard(e.target.value)} disabled={!pasteLGA}>
                    <option value="">— Unmapped —</option>
                    {wards.map(w=><option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Language</label>
                <div className="flex gap-2">
                  {['english','yoruba','hausa','igbo','pidgin'].map(l=>(
                    <button key={l} onClick={()=>setPasteLang(l)}
                      className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg capitalize transition-all ${pasteLang===l?'bg-[#C9A84C] text-black':'bg-[#1A1A1A] border border-white/10 text-white/40 hover:text-white/70'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-[10px] text-white/40">Tagging as:</div>
                {[pasteState||'No State',pasteLGA||'No LGA',pasteWard||'No Ward'].map((t,i)=>(
                  <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${t.startsWith('No')?'bg-white/5 text-white/25':'bg-[#C9A84C]/10 text-[#C9A84C]'}`}>{t}</span>
                ))}
              </div>
              <textarea
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-xl px-4 py-3 text-[13px] font-mono outline-none resize-y min-h-[160px] leading-relaxed focus:border-[rgba(201,168,76,0.55)] placeholder:text-white/20"
                placeholder={"Paste numbers here — any format:\n\n08012345678\n08023456789, 08034567890\n+2348045678901\n\nSystem handles everything automatically."}
                value={pasteText} onChange={e=>setPasteText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-[11px] text-white/35">{detectedCount>0?`~${detectedCount} numbers detected`:'Paste numbers above'}</div>
                <button onClick={handlePasteImport} disabled={pasting||!pasteText.trim()}
                  className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                  <ClipboardPaste size={14}/>{pasting?'Importing…':'Import Numbers →'}
                </button>
              </div>
              {pasteResult&&!pasteResult.error&&(
                <div className="mt-4 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3"><CheckCircle size={18} className="text-[#1D9E75]"/><div className="text-[13px] font-bold text-white">{pasteResult.inserted.toLocaleString()} numbers imported</div></div>
                  <div className="grid grid-cols-4 gap-2 text-center mb-2">
                    {[{l:'Found',v:pasteResult.found,c:'#C9A84C'},{l:'Imported',v:pasteResult.inserted,c:'#1D9E75'},{l:'Invalid',v:pasteResult.invalid,c:'#D85A30'},{l:'Dups',v:pasteResult.duplicates,c:'#4A90D9'}].map(s=>(
                      <div key={s.l} className="bg-[#1A1A1A] rounded-lg p-2"><div className="font-bold text-[14px]" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-white/35 uppercase">{s.l}</div></div>
                    ))}
                  </div>
                  <div className="text-[11px] text-white/40 mb-2">Tagged: {pasteResult.geography.state} → {pasteResult.geography.lga}{pasteResult.geography.ward?` → ${pasteResult.geography.ward}`:''}</div>
                  <button onClick={()=>{setPasteText('');setPasteResult(null)}} className="text-[11px] text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">Paste another batch →</button>
                </div>
              )}
              {pasteResult?.error&&<div className="mt-3 flex items-center gap-2 bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-[12px] text-[#D85A30]"><AlertCircle size={14}/>{pasteResult.error}</div>}
            </div>
          )}

          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Templates</div>
            <div className="flex gap-3">
              <button onClick={()=>{const csv='phone,name,state,lga,ward,language\n08012345678,Sample Voter,Lagos,Alimosho,Ayobo,yoruba';const b=new Blob([csv],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='smartcandidate_template.csv';a.click()}}
                className="flex items-center gap-2 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
                <Download size={13}/>Download Template
              </button>
              <button onClick={()=>window.open('/api/recipients/export','_blank')}
                className="flex items-center gap-2 border border-white/10 text-white/40 text-[12px] font-semibold px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
                <Download size={13}/>Export Database (Admin)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
