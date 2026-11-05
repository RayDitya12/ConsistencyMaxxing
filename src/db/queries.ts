import { db } from './db'
import { checkKey, type Check, type CheckStatus, type Entry, type Item, type MediaRecord, type Slot, type SlotKind, type Template } from './types'
import { weekdayIndex } from '../lib/dates'
import { newId } from '../lib/ids'

export async function activeTemplates(): Promise<Template[]> {
  return db.templates.filter((t) => t.archivedAt === null).toArray()
}

/** Slot yang dijadwalkan pada tanggal ini, gabungan dari semua template aktif.
 * Pattern hanya niat: ia tidak pernah memblokir atau menyalahkan hari nyata. */
export async function slotsForDate(date: string): Promise<Slot[]> {
  const wd = weekdayIndex(date)
  const templates = await activeTemplates()
  const wanted = templates
    .map((t) => ({ templateId: t.id, key: t.pattern[wd] }))
    .filter((p): p is { templateId: string; key: string } => Boolean(p.key))
  if (wanted.length === 0) return []
  const ids = await db.slots
    .where('[templateId+key]')
    .anyOf(wanted.map((p) => [p.templateId, p.key]))
    .primaryKeys()
  return (await db.slots.bulkGet(ids)).filter((s): s is Slot => Boolean(s))
}

export async function itemsForSlot(slotId: string): Promise<Item[]> {
  return db.items.where('slotId').equals(slotId).sortBy('order')
}

export async function itemsForSlots(slotIds: string[]): Promise<Map<string, Item[]>> {
  const map = new Map<string, Item[]>()
  for (const id of slotIds) map.set(id, await itemsForSlot(id))
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

/** Satu entri per (tanggal, slot); slotId null = bukti level hari. */
export async function ensureEntry(date: string, slotId: string | null): Promise<Entry> {
  const hit = await entryFor(date, slotId)
  if (hit) return hit
  const entry: Entry = { id: newId('entry'), date, slotId, status: null, note: '', capturedAt: Date.now() }
  await db.entries.add(entry)
  return entry
}

export async function entryFor(date: string, slotId: string | null): Promise<Entry | undefined> {
  return db.entries.where('date').equals(date).and((e) => e.slotId === slotId).first()
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
export async function setEntryStatus(date: string, slotId: string, status: CheckStatus | null) {
  const entry = await ensureEntry(date, slotId)
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

export async function countMediaByDate(date: string): Promise<number> {
  return db.media.where('date').equals(date).count()
}

export async function ensureSlot(templateId: string, key: string, name: string, kind: SlotKind = 'active'): Promise<Slot> {
  const existing = await db.slots.where('[templateId+key]').equals([templateId, key]).first()
  if (existing) return existing
  const slot: Slot = { id: newId('slot'), templateId, key, name, kind, note: '' }
  await db.slots.add(slot)
  return slot
}
