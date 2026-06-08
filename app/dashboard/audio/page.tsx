'use client'
// app/dashboard/audio/page.tsx
// Upload and manage audio files for robocall campaigns
// Supports candidate's own voice recordings

import { useState, useEffect, useRef } from 'react'
import { Upload, Play, Pause, Trash2, Mic, CheckCircle, AlertCircle } from 'lucide-react'

interface AudioFile {
  name: string
  size: number
  created_at: string
  url: string
}

export default function AudioPage() {
  const [files, setFiles]         = useState<AudioFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [label, setLabel]         = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [playing, setPlaying]     = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const fileRef   = useRef<HTMLInputElement>(null)
  const audioRef  = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    setLoading(true)
    const res = await fetch('/api/audio')
    const data = await res.json()
    setFiles(data.files ?? [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('label', label || file.name.replace(/\.[^/.]+$/, ''))

    const res = await fetch('/api/audio', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
    } else {
      setSuccess(`✓ "${data.name}" uploaded successfully`)
      setLabel('')
      if (fileRef.current) fileRef.current.value = ''
      loadFiles()
    }
    setUploading(false)
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return
    await fetch('/api/audio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    })
    loadFiles()
  }

  function togglePlay(url: string) {
    if (playing === url) {
      audioRef.current?.pause()
      setPlaying(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = url
        audioRef.current.play()
      } else {
        audioRef.current = new Audio(url)
        audioRef.current.play()
        audioRef.current.onended = () => setPlaying(null)
      }
      setPlaying(url)
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="max-w-[900px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">
          Voice Campaigns
        </div>
        <h1 className="font-serif text-3xl font-black text-white">
          Audio <span className="text-[#C9A84C]">Library</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Upload the candidate's recorded voice messages for robocall campaigns.
          Voters hear directly from the candidate — far more effective than text-to-speech.
        </p>
      </div>

      {/* Setup notice */}
      <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.2)] rounded-xl p-4">
        <div className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest mb-2">
          One-time Supabase Setup Required
        </div>
        <div className="text-[12px] text-white/60 leading-relaxed">
          Before uploading audio, create a storage bucket in Supabase:
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li>Go to your Supabase project → <strong className="text-white/80">Storage</strong></li>
            <li>Click <strong className="text-white/80">New bucket</strong></li>
            <li>Name it exactly: <code className="bg-[#1A1A1A] px-1.5 py-0.5 rounded text-[#C9A84C]">audio</code></li>
            <li>Check <strong className="text-white/80">Public bucket</strong> → Create</li>
          </ol>
        </div>
      </div>

      {/* Upload card */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
          Upload New Audio
        </div>

        <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] rounded-lg p-3 mb-4 text-[11px] text-white/50 leading-relaxed">
          <strong className="text-white/80">Tips for best results:</strong><br/>
          • Record in a quiet room with no background noise<br/>
          • Speak clearly and naturally — like you're talking to a friend<br/>
          • Keep messages under 60 seconds (30 seconds is ideal)<br/>
          • MP3 format recommended · Max file size: 10MB<br/>
          • Record multiple versions: Yoruba, English, Hausa, etc.
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Audio Label (what this recording is for)
            </label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)] placeholder:text-white/20"
              placeholder="e.g. GOTV Message - Yoruba · Infrastructure Speech - English · Election Day Reminder"
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[rgba(201,168,76,0.25)] rounded-xl p-8 text-center cursor-pointer hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.04)] transition-all"
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              className="hidden"
              onChange={handleUpload}
            />
            {uploading ? (
              <div className="text-[13px] text-[#C9A84C] font-semibold">Uploading…</div>
            ) : (
              <>
                <Mic size={28} className="text-[#C9A84C]/50 mx-auto mb-2" />
                <div className="text-[13px] font-semibold text-white/70">
                  Click to upload audio file
                </div>
                <div className="text-[11px] text-white/30 mt-1">
                  MP3, WAV, OGG, M4A, AAC · Max 10MB
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-[12px] text-[#D85A30]">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-3 text-[12px] text-[#1D9E75]">
            <CheckCircle size={14} />
            {success}
          </div>
        )}
      </div>

      {/* Audio library */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
          Your Audio Files
        </div>

        {loading ? (
          <div className="text-center py-6 text-white/25 text-sm">Loading…</div>
        ) : files.length === 0 ? (
          <div className="text-center py-10 text-white/25">
            <Mic size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm">No audio files yet</div>
            <div className="text-[11px] mt-1">Upload the candidate's voice recordings above</div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div
                key={f.name}
                className="flex items-center gap-3 bg-[#1A1A1A] border border-[rgba(201,168,76,0.1)] rounded-lg p-3 hover:border-[rgba(201,168,76,0.25)] transition-all"
              >
                {/* Play button */}
                <button
                  onClick={() => togglePlay(f.url)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    playing === f.url
                      ? 'bg-[#D85A30] text-white'
                      : 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C] hover:bg-[rgba(201,168,76,0.2)]'
                  }`}
                >
                  {playing === f.url ? <Pause size={14} /> : <Play size={14} />}
                </button>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white truncate">
                    {f.name.replace(/_\d+\.(mp3|wav|ogg|m4a|aac)$/i, '').replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-white/35 mt-0.5 flex gap-3">
                    <span>{formatSize(f.size)}</span>
                    <span>·</span>
                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Copy URL button */}
                <button
                  onClick={() => { navigator.clipboard.writeText(f.url); setSuccess('URL copied — paste into Voice campaign') }}
                  className="text-[10px] font-semibold text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors px-2 py-1 rounded border border-transparent hover:border-[rgba(201,168,76,0.2)]"
                >
                  Copy URL
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(f.name)}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/25 hover:text-[#D85A30] hover:bg-[#D85A30]/10 transition-all flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How to use in campaign */}
      <div className="card border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.03)]">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
          How to Use in a Robocall Campaign
        </div>
        <div className="text-[12px] text-white/55 leading-relaxed space-y-1.5">
          <div>1. Upload your audio file above and copy its URL</div>
          <div>2. Go to <strong className="text-white/80">Broadcast</strong> → create a new campaign</div>
          <div>3. Select <strong className="text-white/80">Voice / Robocall</strong> as the channel</div>
          <div>4. Paste the audio URL in the <strong className="text-white/80">Media URL</strong> field</div>
          <div>5. Africa's Talking will play your recording when the voter picks up</div>
          <div>6. Add DTMF options: "Press 1 to confirm support, press 2 for more info"</div>
        </div>
      </div>
    </div>
  )
}
