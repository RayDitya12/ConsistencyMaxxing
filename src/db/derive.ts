import { addDays, diffDays, weekStartKey } from '../lib/dates'

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

export function slotCoverage(
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
