import { useEffect, useRef, useState } from 'react'
import type { CardMode } from '../config'
import { renderCapture } from '../capture/pipeline'
import {
  CameraUnavailable,
  closeCamera,
  grabFrame,
  openCamera,
  pickViaInput,
  type Facing,
  type OpenedCamera,
} from '../capture/viewfinder'
import { ensureEntry } from '../db/queries'
import { storeMedia } from '../storage/vault'
import { Button } from './ui'

type Stage = 'idle' | 'opening' | 'live' | 'error'

interface Props {
  dateKey: string
  slotId: string | null
  slotLabel: string | null
  /** Sheet plan membukakan kamera sendiri; tap row = tap 'Buka kamera'. */
  autoStart?: boolean
  onCaptured?: () => void
}

export function CameraShutter({ dateKey, slotId, slotLabel, autoStart = false, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<OpenedCamera | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [problem, setProblem] = useState('')
  const [mode, setMode] = useState<CardMode>('portrait')
  const [facing, setFacing] = useState<Facing>('environment')
  const [busy, setBusy] = useState(false)

  useEffect(() => () => closeCamera(cameraRef.current), [])

  async function start(next: Facing = facing) {
    setStage('opening')
    setProblem('')
    try {
      closeCamera(cameraRef.current)
      cameraRef.current = await openCamera(next, videoRef.current ?? undefined)
      setFacing(next)
      setStage('live')
    } catch (err) {
      setProblem(err instanceof CameraUnavailable ? err.message : (err as Error).message)
      setStage('error')
    }
  }

  // Sheet plan memanggil getUserMedia begitu ia dibuka, masih di dalam jejak tap pengguna.
  // Penanda hidupnya per-permintaan, bukan per-komponen: React boleh memanggil effect ini
  // dua kali di dev, dan permintaan yang sudah dibuang tidak boleh menutup kamera berikutnya.
  useEffect(() => {
    if (!autoStart) return
    const jalan = { aktif: true }
    void (async () => {
      try {
        const cam = await openCamera('environment', videoRef.current ?? undefined)
        if (!jalan.aktif) {
          closeCamera(cam)
          return
        }
        cameraRef.current = cam
        setStage('live')
      } catch (err) {
        if (!jalan.aktif) return
        setProblem(err instanceof CameraUnavailable ? err.message : (err as Error).message)
        setStage('error')
      }
    })()
    return () => {
      jalan.aktif = false
    }
  }, [autoStart])

  function stop() {
    closeCamera(cameraRef.current)
    cameraRef.current = null
    setProblem('')
    setStage('idle')
  }

  async function compose(blob: Blob, source: 'viewfinder' | 'fallback') {
    setBusy(true)
    try {
      const card = await renderCapture({ blob, mode, dateKey, slotLabel, weekStreak: 0, dailyStreak: 0 })
      const entry = await ensureEntry(dateKey, slotId)
      await storeMedia({
        date: dateKey,
        entryId: entry.id,
        slotLabel,
        card: card.card,
        thumb: card.thumb,
        encodeMime: card.encodeMime,
        source,
        mode: card.mode,
        width: card.width,
        height: card.height,
        caption: card.caption,
      })
      onCaptured?.()
    } catch (err) {
      setProblem((err as Error).message)
      setStage('error')
    } finally {
      setBusy(false)
    }
  }

  async function shoot() {
    const video = videoRef.current
    if (!video || busy) return
    await compose(await grabFrame(video), 'viewfinder')
  }

  async function viaFile() {
    const blob = await pickViaInput()
    if (blob) await compose(blob, 'fallback')
  }

  return (
    <div className="pb-4">
      <div className="relative w-full overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
        <div className="aspect-square w-full">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ display: stage === 'live' ? 'block' : 'none' }}
          />
          {stage !== 'live' && (
            <div
              className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] leading-relaxed text-ink-2"
              style={{ background: 'var(--surface-2)' }}
            >
              {stage === 'opening' ? 'Menyalakan kamera…' : stage === 'idle' ? 'Belum ada kamera aktif.' : problem}
            </div>
          )}
        </div>
      </div>

      {stage === 'live' ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <ModeToggle mode={mode} onChange={setMode} />
            <button
              type="button"
              onClick={() => start(facing === 'environment' ? 'user' : 'environment')}
              className="touch-target px-2 text-[11px] uppercase tracking-[0.14em] text-ink-2"
            >
              balik
            </button>
          </div>
          <div className="flex items-center justify-center py-2">
            <button
              type="button"
              aria-label="Ambil foto"
              disabled={busy}
              onClick={shoot}
              className="touch-target flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 disabled:opacity-50"
              style={{ borderColor: 'var(--line)' }}
            >
              <span
                className="block h-[54px] w-[54px] rounded-full"
                style={{ background: busy ? 'var(--ink-2)' : 'var(--ink)' }}
              />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Button onClick={stop}>Tutup kamera</Button>
            <GalleryButton onPick={viaFile} busy={busy} />
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="accent" disabled={stage === 'opening'} onClick={() => start()}>
            {stage === 'opening' ? 'Membuka…' : stage === 'error' ? 'Coba lagi' : 'Buka kamera'}
          </Button>
          <GalleryButton onPick={viaFile} busy={stage === 'opening' || busy} />
        </div>
      )}
    </div>
  )
}

// Kamera tetap jalur utama; ini opsi yang selalu ada, bukan hadiah setelah kamera gagal.
function GalleryButton({ onPick, busy }: { onPick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onPick}
      className="touch-target px-2 text-[11px] uppercase tracking-[0.14em] text-ink-2 disabled:opacity-40"
    >
      pilih dari galeri
    </button>
  )
}

function ModeToggle({ mode, onChange }: { mode: CardMode; onChange: (m: CardMode) => void }) {
  return (
    <div className="flex" style={{ border: '1px solid var(--line)' }}>
      {(['portrait', 'landscape'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className="touch-target px-3 text-[11px] uppercase tracking-[0.14em]"
          style={m === mode ? { background: 'var(--ink)', color: 'var(--surface)' } : { color: 'var(--ink-2)' }}
        >
          {m === 'portrait' ? 'tegak' : 'tidur'}
        </button>
      ))}
    </div>
  )
}
