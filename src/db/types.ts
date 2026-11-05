/** Plan yang ditulis sendiri oleh user: satu nama, dan hari-hari ia muncul. */
export interface Plan {
  id: string
  name: string
  /** indeks hari, 0 = Senin. Hari yang tidak dipilih berarti plan ini tidak ada di situ. */
  days: number[]
  createdAt: number
}

export interface Item {
  id: string
  planId: string
  label: string
  order: number
}

export interface Entry {
  id: string
  date: string
  /** null untuk bukti level hari, dipakai oleh foto yang tidak menempel pada plan apa pun */
  planId: string | null
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
