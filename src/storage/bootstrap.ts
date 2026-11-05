import { ensureCaptionFonts } from '../capture/fonts'
import { readStorageState, requestPersistence, type StorageState } from './capability'
import { sweepOrphans } from './sweep'

export interface BootState extends StorageState {
  fontsReady: boolean
  orphansRemoved: number
  storageBlocked: boolean
}

let state: BootState | null = null
const listeners = new Set<(s: BootState) => void>()

export function currentBoot(): BootState | null {
  return state
}

export function onBoot(fn: (s: BootState) => void): () => void {
  listeners.add(fn)
  if (state) fn(state)
  return () => listeners.delete(fn)
}

function publish(next: BootState) {
  state = next
  listeners.forEach((fn) => fn(next))
}

export async function bootstrap(): Promise<BootState> {
  const base = await readStorageState()
  const orphansRemoved = base.opfs ? await sweepOrphans().then((r) => r.length) : 0
  const partial: BootState = {
    ...base,
    fontsReady: false,
    orphansRemoved,
    storageBlocked: !base.opfs,
  }
  publish(partial)

  const fontsReady = await ensureCaptionFonts()
  // sengaja tidak memanggil persist() di sini: Chrome menjadwalkan masa tunggu setelah satu
  // penolakan, jadi permintaan otomatis saat boot bisa membuat tombol 'Minta izin' mati selama
  // beberapa hari. Izin hanya diminta lewat tombol.
  const persisted = partial.persisted
  const storage = partial.opfs ? await readStorageState() : partial
  const final: BootState = { ...storage, persisted, fontsReady, orphansRemoved, storageBlocked: !partial.opfs }
  publish(final)
  return final
}

/** Minta izin simpan ke Chrome atas tombol, bukan diam-diam saat boot. */
export async function persistNow(): Promise<boolean> {
  const granted = await requestPersistence()
  if (state) publish({ ...state, persisted: granted })
  return granted
}

export function shutterReady(s: BootState | null): boolean {
  if (!s) return false
  return s.opfs && s.fontsReady
}
