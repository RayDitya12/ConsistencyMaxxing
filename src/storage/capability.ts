import { supportsOpfs } from './backend'

export type EncodeMime = 'image/webp' | 'image/jpeg'

let cachedEncode: EncodeMime | null = null

async function tryEncode(canvas: HTMLCanvasElement | OffscreenCanvas, mime: string): Promise<boolean> {
  if ('convertToBlob' in canvas) {
    const blob = await canvas.convertToBlob({ type: mime, quality: 0.5 })
    return blob.type === mime
  }
  return new Promise((resolve) => {
    ;(canvas as HTMLCanvasElement).toBlob((b) => resolve(b?.type === mime), mime, 0.5)
  })
}

/** Support canvas ke WebP belum konsisten di WebKit, jadi dideteksi sekali lalu disimpan per foto. */
export async function detectEncodeMime(): Promise<EncodeMime> {
  if (cachedEncode) return cachedEncode
  try {
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(2, 2)
        : Object.assign(document.createElement('canvas'), { width: 2, height: 2 })
    const ctx = canvas.getContext('2d')
    ctx?.fillRect(0, 0, 2, 2)
    cachedEncode = (await tryEncode(canvas, 'image/webp')) ? 'image/webp' : 'image/jpeg'
  } catch {
    cachedEncode = 'image/jpeg'
  }
  return cachedEncode
}

export function setEncodeMimeForTest(mime: EncodeMime | null) {
  cachedEncode = mime
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageState {
  opfs: boolean
  persisted: boolean
  usage: number
  quota: number
  encode: EncodeMime
}

export async function readStorageState(): Promise<StorageState> {
  const persisted = typeof navigator !== 'undefined' && !!navigator.storage?.persisted
    ? await navigator.storage.persisted().catch(() => false)
    : false
  const est = navigator?.storage?.estimate ? await navigator.storage.estimate() : {}
  return {
    opfs: supportsOpfs(),
    persisted,
    usage: est.usage ?? 0,
    quota: est.quota ?? 0,
    encode: await detectEncodeMime(),
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export function monthsOfHeadroom(quota: number, usage: number, usagePerMonth: number): number | null {
  if (quota <= 0 || usagePerMonth <= 0) return null
  return Math.max(0, Math.floor((quota - usage) / usagePerMonth))
}
