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

/** Satu entri per (tanggal, slot); slotId null = bukti level hari. */
export async function ensureEntry(date: string, slotId: string | null): Promise<Entry> {
  const forDay = await db.entries.where('date').equals(date).toArray()
  const hit = forDay.find((e) => e.slotId === slotId)
  if (hit) return hit
  const entry: Entry = { id: newId('entry'), date, slotId, note: '', capturedAt: Date.now() }
  await db.entries.add(entry)
  return entry
}

export async function entriesForDate(date: string): Promise<Entry[]> {
  return db.entries.where('date').equals(date).toArray()
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
