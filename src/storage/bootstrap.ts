import { ensureCaptionFonts } from '../capture/fonts'
import { putMeta } from '../db/db'
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

async function publish(next: BootState) {
  state = next
  await putMeta('boot', next)
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
  await publish(partial)

  const fontsReady = await ensureCaptionFonts()
  const persisted = partial.opfs ? await requestPersistence() : partial.persisted
  const storage = partial.opfs ? await readStorageState() : partial
  const final: BootState = { ...storage, persisted, fontsReady, orphansRemoved, storageBlocked: !partial.opfs }
  await publish(final)
  return final
}

export function shutterReady(s: BootState | null): boolean {
  if (!s) return false
  return s.opfs && s.fontsReady
}
