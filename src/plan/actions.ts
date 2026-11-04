import { db } from '../db/db'
import { newId } from '../lib/ids'
import { ensureSlot } from '../db/queries'
import { parseWeeklyPattern } from './pattern'
import type { Item, Slot, SlotKind, Template } from '../db/types'
import { WEEKDAY_LABELS } from '../config'

export type Domain = Template['domain']

export async function createTemplate(name: string, domain: Domain, patternInput: string): Promise<Template> {
  const parsed = parseWeeklyPattern(patternInput)
  if (!parsed.ok) throw new Error(parsed.error)
  const template: Template = {
    id: newId('tpl'),
    name: name.trim() || 'Rencana',
    domain,
    pattern: parsed.keys,
    color: '#e8540c',
    createdAt: Date.now(),
    archivedAt: null,
  }
  await db.templates.add(template)
  await ensureSlotsForKeys(template.id, parsed.distinct)
  return template
}

/** Huruf yang sering dipakai orang untuk jadwal latihan dikenali, sisanya tetap huruf aslinya. */
function slotDefaults(key: string): { name: string; kind: SlotKind } {
  const known: Record<string, string> = { U: 'Upper', L: 'Lower', R: 'Rest', D: 'Deload', S: 'Skill' }
  const name = known[key] ?? key
  return { name, kind: name === 'Rest' ? 'rest' : 'active' }
}

async function ensureSlotsForKeys(templateId: string, keys: string[]) {
  for (const key of keys) {
    const slot = slotDefaults(key)
    await ensureSlot(templateId, key, slot.name, slot.kind)
  }
}

export async function updatePattern(templateId: string, patternInput: string) {
  const parsed = parseWeeklyPattern(patternInput)
  if (!parsed.ok) throw new Error(parsed.error)
  const template = await db.templates.get(templateId)
  if (!template) throw new Error('template tidak ada')
  await db.templates.update(templateId, { pattern: parsed.keys })
  await ensureSlotsForKeys(templateId, parsed.distinct)
  for (const slot of await db.slots.where('templateId').equals(templateId).toArray()) {
    if (!parsed.distinct.includes(slot.key)) await removeSlot(slot.id)
  }
}

export async function renameSlot(slotId: string, name: string) {
  await db.slots.update(slotId, { name: name.trim() || 'Slot' })
}

export async function setSlotKind(slotId: string, kind: SlotKind) {
  await db.slots.update(slotId, { kind })
}

export async function setSlotNote(slotId: string, note: string) {
  await db.slots.update(slotId, { note })
}

export async function removeSlot(slotId: string) {
  await db.items.where('slotId').equals(slotId).delete()
  await db.slots.delete(slotId)
}

export async function addItem(slotId: string, label: string): Promise<Item | null> {
  const clean = label.trim()
  if (!clean) return null
  const existing = await db.items.where('slotId').equals(slotId).count()
  const item: Item = { id: newId('itm'), slotId, label: clean, order: existing }
  await db.items.add(item)
  return item
}

export async function renameItem(itemId: string, label: string) {
  const clean = label.trim()
  if (!clean) return db.items.delete(itemId)
  return db.items.update(itemId, { label: clean })
}

export async function removeItem(itemId: string) {
  const item = await db.items.get(itemId)
  if (!item) return
  await db.transaction('rw', db.items, db.checks, async () => {
    await db.items.delete(itemId)
    await db.checks.where('itemId').equals(itemId).delete()
  })
}

export async function moveItem(itemId: string, direction: -1 | 1) {
  const item = await db.items.get(itemId)
  if (!item) return
  const siblings = await db.items.where('slotId').equals(item.slotId).sortBy('order')
  const index = siblings.findIndex((s) => s.id === itemId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= siblings.length) return
  const swap = siblings[target]
  await db.items.bulkPut([
    { ...item, order: swap.order },
    { ...swap, order: item.order },
  ])
}

export async function archiveTemplate(templateId: string) {
  const slots = await db.slots.where('templateId').equals(templateId).toArray()
  await db.transaction('rw', db.templates, db.slots, db.items, db.entries, db.checks, async () => {
    await db.templates.update(templateId, { archivedAt: Date.now() })
    for (const slot of slots) {
      const linked = await db.entries.where('slotId').equals(slot.id).count()
      if (linked === 0) await removeSlot(slot.id)
    }
  })
}

export function patternPreview(keys: string[], slots: Slot[]): string {
  const byKey = new Map(slots.map((s) => [s.key, s]))
  return keys
    .map((k, i) => `${WEEKDAY_LABELS[i]} ${byKey.get(k)?.name ?? k}`)
    .join('  /  ')
}
