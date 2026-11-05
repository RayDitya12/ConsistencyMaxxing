export type SlotKind = 'active' | 'rest'

export interface Template {
  id: string
  name: string
  domain: 'workout' | 'study' | 'skill' | 'custom'
  /** tujuh kunci slot, indeks 0 = Senin */
  pattern: string[]
  color: string
  createdAt: number
  archivedAt: number | null
}

export interface Slot {
  id: string
  templateId: string
  key: string
  name: string
  kind: SlotKind
  note: string
}

export interface Item {
  id: string
  slotId: string
  label: string
  order: number
}

export interface Entry {
  id: string
  date: string
  /** null untuk bukti level hari (hari Rest tetap boleh ada foto) */
  slotId: string | null
  /** status keputusan pada satu plan hari ini. Entri foto tidak membutuhkannya. */
  status: CheckStatus | null
  note: string
  capturedAt: number
}

export type CheckStatus = 'done' | 'skip'

export interface Check {
  /** `${date}|${itemId}` */
  key: string
  date: string
  itemId: string
  status: CheckStatus
  note: string
  updatedAt: number
}

export interface MediaRecord {
  id: string
  date: string
  entryId: string
  file: string
  thumb: string
  mime: string
  encodeMime: 'image/webp' | 'image/jpeg'
  source: 'viewfinder' | 'fallback'
  bytes: number
  thumbBytes: number
  w: number
  h: number
  mode: 'portrait' | 'landscape'
  caption: string
  createdAt: number
}

export const checkKey = (date: string, itemId: string) => `${date}|${itemId}`
