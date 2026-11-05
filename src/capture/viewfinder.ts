export type Facing = 'user' | 'environment'

export interface OpenedCamera {
  stream: MediaStream
  track: MediaStreamTrack
  video: HTMLVideoElement
}

export type CameraFailure = 'denied' | 'absent' | 'unsupported' | 'insecure'

const CAMERA_MESSAGES: Record<CameraFailure, string> = {
  insecure: 'Kamera butuh HTTPS. Buka lewat alamat https, bukan http.',
  denied: 'Izin kamera ditolak. Aktifkan di pengaturan situs.',
  absent: 'Tidak ada kamera yang bisa diakses.',
  unsupported: 'Browser ini tidak mendukung akses kamera langsung.',
}

export class CameraUnavailable extends Error {
  readonly reason: CameraFailure

  constructor(reason: CameraFailure) {
    super(CAMERA_MESSAGES[reason])
    this.name = 'CameraUnavailable'
    this.reason = reason
  }
}

export async function openCamera(facing: Facing = 'environment', target?: HTMLVideoElement): Promise<OpenedCamera> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia)
    throw new CameraUnavailable('unsupported')
  if (!window.isSecureContext) throw new CameraUnavailable('insecure')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 2560 } },
      audio: false,
    })
  } catch (err) {
    throw new CameraUnavailable((err as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'absent')
  }
  const track = stream.getVideoTracks()[0]
  const video = target ?? document.createElement('video')
  video.srcObject = stream
  video.setAttribute('playsinline', '')
  video.muted = true
  await video.play()
  return { stream, track, video }
}

export function closeCamera(camera: OpenedCamera | null) {
  if (!camera) return
  camera.stream.getTracks().forEach((t) => t.stop())
  camera.video.srcObject = null
}

export async function grabFrame(video: HTMLVideoElement): Promise<Blob> {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('Video belum siap')
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d tidak tersedia')
  ctx.drawImage(video, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membaca bingkai video'))), 'image/jpeg', 0.95),
  )
}

/** Opsi "pilih dari galeri" di shutter; juga jalan cadangan kalau getUserMedia diblok (WebView,
 * beberapa browser). Tanpa atribut capture: Android akan membuka kamera sistem lagi, padahal
 * tombol ini justru untuk memilih berkas. Dicatat sebagai source 'fallback' supaya jejaknya jujur.
 * Input-nya dipasang ke DOM (beberapa browser mengabaikan click pada elemen lepas) dan selalu
 * satu buah: permintaan berikutnya membuang yang tertinggal dari penolakan sebelumnya. */
const PICK_ID = 'cmx-file-pick'

export function pickViaInput(): Promise<Blob | null> {
  return new Promise((resolve) => {
    document.getElementById(PICK_ID)?.remove()
    const input = document.createElement('input')
    input.id = PICK_ID
    input.type = 'file'
    input.accept = 'image/*'
    input.style.cssText = 'position:fixed;left:-1px;top:0;width:1px;height:1px;opacity:0'
    document.body.appendChild(input)
    const finish = (blob: Blob | null) => {
      input.remove()
      resolve(blob)
    }
    input.onchange = () => finish(input.files?.[0] ?? null)
    input.oncancel = () => finish(null)
    input.click()
  })
}
