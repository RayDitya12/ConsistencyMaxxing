import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
import { announceSaved } from '../lib/saved'
import { ensureEntry } from '../db/queries'
import { storeMedia } from '../storage/vault'
import { Button } from './ui'

type Stage = 'opening' | 'live' | 'error'

interface Props {
  dateKey: string
  planId: string
  planLabel: string
}

/**
 * Rasa aplikasi kamera: sheet plan langsung menyalakan jendela bidik tanpa tombol perantara.
 * Rana bulat di tengah, ikon galeri kecil di sebelahnya, pemilih sisi kamera di kanan.
 */
export function CameraShutter({ dateKey, planId, planLabel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<OpenedCamera | null>(null)
  const [stage, setStage] = useState<Stage>('opening')
  const [problem, setProblem] = useState('')
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

  // getUserMedia dipanggil masih di dalam jejak tap yang membuka sheet ini. Penanda hidupnya
  // per-permintaan, bukan per-komponen: React memanggil effect ini dua kali di dev, dan permintaan
  // yang sudah dibuang tidak boleh menutup kamera berikutnya.
  useEffect(() => {
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
  }, [])

  async function compose(blob: Blob, source: 'viewfinder' | 'fallback') {
    setBusy(true)
    setProblem('')
    try {
      const card = await renderCapture({ blob, dateKey, planLabel, weekStreak: 0, dailyStreak: 0 })
      const entry = await ensureEntry(dateKey, planId)
      await storeMedia({
        date: dateKey,
        entryId: entry.id,
        planLabel,
        card: card.card,
        thumb: card.thumb,
        encodeMime: card.encodeMime,
        source,
        width: card.width,
        height: card.height,
        caption: card.caption,
      })
      announceSaved()
    } catch (err) {
      setProblem((err as Error).message)
      setStage('error')
    } finally {
      setBusy(false)
    }
  }

  async function shoot() {
    const video = videoRef.current
    if (!video || busy || stage !== 'live') return
    await compose(await grabFrame(video), 'viewfinder')
  }

  async function viaFile() {
    if (busy) return
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
              className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-[13px] leading-relaxed text-ink-2"
              style={{ background: 'var(--surface-2)' }}
            >
              {stage === 'opening' ? <span>Menyalakan kamera…</span> : (
                <>
                  <span>{problem}</span>
                  <Button onClick={() => void start()}>Coba lagi</Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-10">
        <IconButton label="Pilih gambar dari galeri" onClick={() => void viaFile()} disabled={busy}>
          <GalleryIcon />
        </IconButton>
        <button
          type="button"
          aria-label="Ambil foto"
          disabled={stage !== 'live' || busy}
          onClick={() => void shoot()}
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 disabled:opacity-40"
          style={{ borderColor: 'var(--line)' }}
        >
          <span
            className="block h-[54px] w-[54px] rounded-full"
            style={{ background: busy || stage !== 'live' ? 'var(--ink-2)' : 'var(--ink)' }}
          />
        </button>
        <IconButton
          label="Ganti sisi kamera"
          onClick={() => void start(facing === 'environment' ? 'user' : 'environment')}
          disabled={stage !== 'live' || busy}
        >
          <FlipIcon />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="touch-target flex h-11 w-11 items-center justify-center rounded-full border text-ink-2 disabled:opacity-40"
      style={{ borderColor: 'var(--hairline)' }}
    >
      {children}
    </button>
  )
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <circle cx="8.4" cy="9.6" r="1.4" />
      <path d="M3.5 17.5l4.5-4.5 3.5 3 3-2.5 5.5 5" />
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4.5 10a7.5 7.5 0 0112.6-3.4M19.5 14a7.5 7.5 0 01-12.6 3.4" />
      <path d="M17 3.5v3.2h-3.2M7 20.5v-3.2h3.2" />
    </svg>
  )
}
