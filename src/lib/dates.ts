import { WEEKDAY_LABELS } from '../config'

const pad = (n: number) => String(n).padStart(2, '0')

/** Kunci tanggal dalam zona waktu lokal. Jangan pernah pakai toISOString di sini:
 * sesi malam akan jatuh ke tanggal berikutnya dan streak rusak tanpa sebab kelihatan. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function todayKey(now = new Date()): string {
  return dateKey(now)
}

/** Dalam masa tenggang setelah tengah malam, "hari ini" masih tanggal kemarin. */
export function loggingDateKey(now = new Date(), graceHours = 2): string {
  const key = dateKey(now)
  if (now.getHours() < graceHours) return addDays(key, -1)
  return key
}

/** 0 = Senin ... 6 = Minggu */
export function weekdayIndex(key: string): number {
  return (parseDateKey(key).getDay() + 6) % 7
}

export function weekStartKey(key: string): string {
  return addDays(key, -weekdayIndex(key))
}

export function diffDays(from: string, to: string): number {
  const a = parseDateKey(from).getTime()
  const b = parseDateKey(to).getTime()
  return Math.round((b - a) / 86_400_000)
}

const longFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })

export function formatLong(key: string): string {
  return longFmt.format(parseDateKey(key)).replace(/^\w/, (c) => c.toUpperCase())
}

export function formatShort(key: string): string {
  return shortFmt.format(parseDateKey(key)).replace(/\//g, '.')
}

export function weekdayLabel(key: string): string {
  return WEEKDAY_LABELS[weekdayIndex(key)]
}

/** Bulan yang tampil di kalender: kunci 'YYYY-MM' dan offset hari pertama (0 = Senin). */
export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateKey(new Date(year, month, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  return { cells, label: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(first) }
}
