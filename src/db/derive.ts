import { addDays, diffDays, weekStartKey } from '../lib/dates'
import type { Entry, MediaRecord } from './types'

export interface Coverage {
  total: number
  done: number
  skip: number
  untracked: string[]
}

/** Hari yang dianggap tercatat: ada minimal satu foto pada tanggal itu. */
export function buildLoggedSet(datesWithMedia: Iterable<string>): Set<string> {
  return new Set(datesWithMedia)
}

export function dailyStreak(logged: Set<string>, today: string): number {
  const start = logged.has(today) ? today : addDays(today, -1)
  if (!logged.has(start)) return 0
  let cursor = start
  let count = 0
  while (logged.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function loggedInWeek(logged: Set<string>, weekStart: string): number {
  let n = 0
  for (let i = 0; i < 7; i++) if (logged.has(addDays(weekStart, i))) n++
  return n
}

/** Minggu berjalan belum lolos ambang -> dihitung dari minggu lalu, supaya angka tidak
 * jatuh ke nol setiap Senin pagi. */
export function weeklyStreak(logged: Set<string>, today: string, threshold: number): number {
  const thisWeek = weekStartKey(today)
  const qualifies = (weekStart: string) => loggedInWeek(logged, weekStart) >= threshold
  let cursor = qualifies(thisWeek) ? thisWeek : addDays(thisWeek, -7)
  let count = 0
  while (qualifies(cursor)) {
    count++
    cursor = addDays(cursor, -7)
  }
  return count
}

export function weekNumber(firstWeekStart: string, today: string): number {
  return Math.floor(diffDays(firstWeekStart, weekStartKey(today)) / 7) + 1
}

export function subplanCoverage(
  itemLabels: Map<string, string>,
  statuses: Map<string, 'done' | 'skip'>,
): Coverage {
  let done = 0
  let skip = 0
  const untracked: string[] = []
  for (const [itemId, label] of itemLabels) {
    const status = statuses.get(itemId)
    if (status === 'done') done++
    else if (status === 'skip') skip++
    else untracked.push(label)
  }
  return { total: itemLabels.size, done, skip, untracked }
}

/** 'full' = ada foto, 'half' = dicentang tanpa foto, 'skip' = dilewati, 'open' = belum ada isi. */
export type PlanState = 'full' | 'half' | 'skip' | 'open'

export interface PlanStatus {
  state: PlanState
  photos: number
  entryId: string | null
}

const NO_STATUS: PlanStatus = { state: 'open', photos: 0, entryId: null }

/** Keadaan tiap plan pada satu hari. Foto selalu menang atas centang, sesuai aturan streak. */
export function planStatuses(
  plans: { id: string }[],
  entries: Entry[],
  media: MediaRecord[],
): Map<string, PlanStatus> {
  const photosPerEntry = new Map<string, number>()
  for (const record of media) photosPerEntry.set(record.entryId, (photosPerEntry.get(record.entryId) ?? 0) + 1)
  const entryOfPlan = new Map<string, Entry>()
  for (const entry of entries) if (entry.planId !== null) entryOfPlan.set(entry.planId, entry)
  const map = new Map<string, PlanStatus>()
  for (const plan of plans) {
    const entry = entryOfPlan.get(plan.id)
    if (!entry) {
      map.set(plan.id, NO_STATUS)
      continue
    }
    const photos = photosPerEntry.get(entry.id) ?? 0
    const state: PlanState =
      photos > 0 ? 'full' : entry.status === 'done' ? 'half' : entry.status === 'skip' ? 'skip' : 'open'
    map.set(plan.id, { state, photos, entryId: entry.id })
  }
  return map
}

export interface DayMark {
  mark: 'full' | 'half' | 'skip'
  photos: number
  plans: number
}

/** Ringkasan sekilas per hari untuk grid bulan: foto menutupi centang setengah, dan 'skip'
 * hanya muncul kalau hari itu tidak punya bukti lain. */
export function monthMarks(entries: Entry[], media: MediaRecord[]): Map<string, DayMark> {
  const photosPerDate = new Map<string, number>()
  const photosPerEntry = new Map<string, number>()
  for (const record of media) {
    photosPerDate.set(record.date, (photosPerDate.get(record.date) ?? 0) + 1)
    photosPerEntry.set(record.entryId, (photosPerEntry.get(record.entryId) ?? 0) + 1)
  }
  const marks = new Map<string, DayMark>()
  const day = (date: string): DayMark => {
    let hit = marks.get(date)
    if (!hit) {
      hit = { mark: 'skip', photos: photosPerDate.get(date) ?? 0, plans: 0 }
      marks.set(date, hit)
    }
    return hit
  }
  for (const date of photosPerDate.keys()) day(date).mark = 'full'
  for (const entry of entries) {
    const own = photosPerEntry.get(entry.id) ?? 0
    if (own === 0 && entry.status === null) continue
    const current = day(entry.date)
    current.plans++
    if (own > 0) current.mark = 'full'
    else if (entry.status === 'done' && current.mark !== 'full') current.mark = 'half'
  }
  return marks
}
