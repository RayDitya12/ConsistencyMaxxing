import { db } from '../db/db'
import { getBackend } from './backend'
import type { MediaRecord } from '../db/types'

const DIRS = ['media', 'thumb'] as const

/** Urutan tulis selalu file dulu lalu record belakangan, jadi kegagalan meninggalkan file yatim,
 * bukan tautan mati. Yang yatim dan berusia lebih tua dari maxAgeMs dibuang di sini. */
export async function sweepOrphans(maxAgeMs = 600_000): Promise<string[]> {
  const rows = await db.media.toArray()
  const live = new Set(rows.flatMap((r) => [r.file, r.thumb]))
  const backend = getBackend()
  const removed: string[] = []
  for (const dir of DIRS) {
    for (const name of await backend.list(dir)) {
      const path = `${dir}/${name}`
      if (live.has(path)) continue
      if (Date.now() - (await backend.lastModified(path)) < maxAgeMs) continue
      await backend.remove(path)
      removed.push(path)
    }
  }
  return removed
}

export async function deleteMediaFiles(record: Pick<MediaRecord, 'file' | 'thumb'>): Promise<void> {
  const backend = getBackend()
  await backend.remove(record.file)
  await backend.remove(record.thumb)
}

/** File yang tercatat di database tapi hilang dari disk (user menghapus data situs sebagian). */
export async function findBrokenLinks(): Promise<MediaRecord[]> {
  const backend = getBackend()
  const rows = await db.media.toArray()
  const broken: MediaRecord[] = []
  for (const r of rows) {
    if (!(await backend.read(r.file))) broken.push(r)
  }
  return broken
}
