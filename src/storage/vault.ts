import { db } from '../db/db'
import { shortId } from '../lib/ids'
import { buildFileName, mediaPath, thumbPath } from '../lib/filename'
import type { MediaRecord } from '../db/types'
import { getBackend } from './backend'
import { deleteMediaFiles } from './sweep'

export interface MediaInput {
  date: string
  entryId: string
  slotLabel: string | null
  card: Blob
  thumb: Blob
  encodeMime: 'image/webp' | 'image/jpeg'
  source: 'viewfinder' | 'fallback'
  mode: 'portrait' | 'landscape'
  width: number
  height: number
  caption: string
}

export async function storeMedia(input: MediaInput): Promise<MediaRecord> {
  const id = shortId()
  const name = buildFileName(input.date, input.slotLabel, id, input.encodeMime)
  const record: MediaRecord = {
    id,
    date: input.date,
    entryId: input.entryId,
    file: mediaPath(name),
    thumb: thumbPath(name),
    mime: input.card.type,
    encodeMime: input.encodeMime,
    source: input.source,
    bytes: input.card.size,
    thumbBytes: input.thumb.size,
    w: input.width,
    h: input.height,
    mode: input.mode,
    caption: input.caption,
    createdAt: Date.now(),
  }
  const backend = getBackend()
  await backend.write(record.file, input.card)
  await backend.write(record.thumb, input.thumb)
  await db.media.add(record)
  return record
}

export async function removeMedia(mediaId: string) {
  const record = await db.media.get(mediaId)
  if (!record) return
  await deleteMediaFiles(record)
  await db.media.delete(mediaId)
}

export async function deleteEntry(entryId: string) {
  const media = await db.media.where('entryId').equals(entryId).toArray()
  for (const m of media) await removeMedia(m.id)
  await db.entries.delete(entryId)
}
