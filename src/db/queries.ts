import { db } from './db'
import { checkKey, type Check, type CheckStatus, type Entry, type Item, type MediaRecord, type Plan } from './types'
import { weekdayIndex } from '../lib/dates'
import { newId } from '../lib/ids'

export async function plansForDate(date: string): Promise<Plan[]> {
  const wd = weekdayIndex(date)
  const rows = await db.plans.filter((p) => p.days.includes(wd)).toArray()
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function allPlans(): Promise<Plan[]> {
  const rows = await db.plans.toArray()
  return rows.sort((a, b) => a.createdAt - b.createdAt)
}

export async function itemsForPlan(planId: string): Promise<Item[]> {
  return db.items.where('planId').equals(planId).sortBy('order')
}

export async function itemsForPlans(planIds: string[]): Promise<Map<string, Item[]>> {
  const map = new Map<string, Item[]>()
  for (const id of planIds) map.set(id, await itemsForPlan(id))
  return map
}

export async function checksForDate(date: string): Promise<Map<string, Check>> {
  const rows = await db.checks.where('date').equals(date).toArray()
  return new Map(rows.map((r) => [r.itemId, r]))
}

export async function setCheck(date: string, itemId: string, status: CheckStatus | null, note = '') {
  const key = checkKey(date, itemId)
  if (status === null) {
    await db.checks.delete(key)
    return
  }
  await db.checks.put({ key, date, itemId, status, note, updatedAt: Date.now() })
}

export async function loggedDates(): Promise<Set<string>> {
  const rows = await db.media.toArray()
  return new Set(rows.map((r) => r.date))
}

export async function mediaForDate(date: string): Promise<MediaRecord[]> {
  return db.media.where('date').equals(date).sortBy('createdAt')
}

/** Semua bukti dalam satu rentang tanggal, terpakai untuk mengisi grid bulan sekali jalan. */
export async function mediaBetween(from: string, to: string): Promise<MediaRecord[]> {
  const rows = await db.media.where('date').between(from, to, true, true).toArray()
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
}

/** Satu entri per (tanggal, plan); planId null = bukti level hari. */
export async function ensureEntry(date: string, planId: string | null): Promise<Entry> {
  const hit = await entryFor(date, planId)
  if (hit) return hit
  const entry: Entry = { id: newId('entry'), date, planId, status: null, note: '', capturedAt: Date.now() }
  await db.entries.add(entry)
  return entry
}

export async function entryFor(date: string, planId: string | null): Promise<Entry | undefined> {
  return db.entries.where('date').equals(date).and((e) => e.planId === planId).first()
}

export async function entriesForDate(date: string): Promise<Entry[]> {
  return db.entries.where('date').equals(date).toArray()
}

/** Semua entri dalam satu rentang tanggal, dipakai menandai grid bulan sekali jalan. */
export async function entriesBetween(from: string, to: string): Promise<Entry[]> {
  return db.entries.where('date').between(from, to, true, true).toArray()
}

/** Setelan plan hari ini: 'done' tanpa foto = centang setengah, 'skip' = dilewati,
 * null = cabut keputusan. Entri yang sudah punya foto tidak ikut dihapus. */
export async function setEntryStatus(date: string, planId: string, status: CheckStatus | null) {
  const entry = await ensureEntry(date, planId)
  const hasPhoto = (await db.media.where('entryId').equals(entry.id).count()) > 0
  if (status === null && !hasPhoto) {
    await db.entries.delete(entry.id)
    return
  }
  await db.entries.update(entry.id, { status })
}

export async function mediaForEntry(entryId: string): Promise<MediaRecord[]> {
  return db.media.where('entryId').equals(entryId).sortBy('createdAt')
}

export async function setNote(entryId: string, note: string) {
  await db.entries.update(entryId, { note })
}
