import { db } from '../db/db'
import { newId } from '../lib/ids'
import { WEEKDAY_LABELS } from '../config'
import type { Item, Plan } from '../db/types'

export function normalizeDays(days: number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d < 7))].sort((a, b) => a - b)
}

export function toggleDay(days: number[], index: number): number[] {
  return normalizeDays(days.includes(index) ? days.filter((d) => d !== index) : [...days, index])
}

export function formatDays(days: number[]): string {
  const picked = normalizeDays(days)
  if (picked.length === 0) return 'belum muncul di hari apa pun'
  if (picked.length === 7) return 'setiap hari'
  return picked.map((d) => WEEKDAY_LABELS[d]).join(' + ')
}

/** createdAt sekaligus menjadi urutan tampilan, jadi dua plan yang dibuat pada milidetik yang
 * sama tetap punya baris pertama: yang tertua tidak pernah menukar tempat saat render berikutnya. */
async function nextStamp(): Promise<number> {
  const newest = (await db.plans.toArray()).reduce((max, p) => Math.max(max, p.createdAt), 0)
  return Math.max(Date.now(), newest + 1)
}

export async function createPlan(name: string, days: number[]): Promise<Plan> {
  const clean = name.trim()
  if (!clean) throw new Error('Nama rencana masih kosong.')
  const plan: Plan = { id: newId('plan'), name: clean, days: normalizeDays(days), createdAt: await nextStamp() }
  await db.plans.add(plan)
  return plan
}

export async function renamePlan(planId: string, name: string) {
  const clean = name.trim()
  if (clean) await db.plans.update(planId, { name: clean })
}

export async function setPlanDays(planId: string, days: number[]) {
  await db.plans.update(planId, { days: normalizeDays(days) })
}

/** Menghapus plan beserta daftar subplan-nya. Histori pada hari-hari lama tetap utuh:
 * entri dan foto yang menunjuk plan ini tidak disentuh, hanya tidak punya nama lagi. */
export async function removePlan(planId: string) {
  await db.transaction('rw', db.plans, db.items, db.checks, async () => {
    for (const item of await db.items.where('planId').equals(planId).toArray()) {
      await db.checks.where('itemId').equals(item.id).delete()
    }
    await db.items.where('planId').equals(planId).delete()
    await db.plans.delete(planId)
  })
}

export async function addSubplan(planId: string, label: string): Promise<Item | null> {
  const clean = label.trim()
  if (!clean) return null
  const order = await db.items.where('planId').equals(planId).count()
  const item: Item = { id: newId('itm'), planId, label: clean, order }
  await db.items.add(item)
  return item
}

export async function renameSubplan(itemId: string, label: string) {
  const clean = label.trim()
  if (!clean) return db.items.delete(itemId)
  return db.items.update(itemId, { label: clean })
}

export async function removeSubplan(itemId: string) {
  const item = await db.items.get(itemId)
  if (!item) return
  await db.transaction('rw', db.items, db.checks, async () => {
    await db.items.delete(itemId)
    await db.checks.where('itemId').equals(itemId).delete()
  })
}

export async function moveSubplan(itemId: string, direction: -1 | 1) {
  const item = await db.items.get(itemId)
  if (!item) return
  const siblings = await db.items.where('planId').equals(item.planId).sortBy('order')
  const index = siblings.findIndex((s) => s.id === itemId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= siblings.length) return
  const swap = siblings[target]
  await db.items.bulkPut([
    { ...item, order: swap.order },
    { ...swap, order: item.order },
  ])
}
