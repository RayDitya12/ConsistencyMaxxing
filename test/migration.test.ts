import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { makeDb } from '../src/db/db'

const NAME = 'migrasi-test'

/** Skema keluaran sebelum model plan ditulis ulang: template + slot, dan baris yang menunjuk slotId. */
async function seedLegacy() {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  const legacy = new Dexie(NAME)
  legacy.version(1).stores({
    templates: 'id, name, archivedAt',
    slots: 'id, templateId, [templateId+key]',
    items: 'id, slotId, [slotId+order]',
    entries: 'id, date, slotId, [date+slotId]',
    checks: 'key, date, itemId, [date+itemId]',
    media: 'id, date, entryId, [date+entryId]',
    meta: 'key',
  })
  await legacy.table('templates').add({ id: 'tpl_1', name: 'Workout', archivedAt: null })
  await legacy.table('slots').add({ id: 'slot_1', templateId: 'tpl_1', key: 'U', name: 'Upper' })
  await legacy.table('items').add({ id: 'itm_1', slotId: 'slot_1', label: 'Bench press', order: 0 })
  await legacy.table('entries').bulkAdd([
    { id: 'ent_plan', date: '2026-11-02', slotId: 'slot_1', status: 'done', note: '', capturedAt: 1 },
    { id: 'ent_day', date: '2026-11-03', slotId: null, status: null, note: 'catatan hari', capturedAt: 2 },
  ])
  await legacy
    .table('checks')
    .add({ key: '2026-11-02|itm_1', date: '2026-11-02', itemId: 'itm_1', status: 'done', note: '', updatedAt: 1 })
  await legacy.table('media').add({
    id: 'med_1',
    date: '2026-11-03',
    entryId: 'ent_day',
    file: 'media/2026-11-03__Day__aaaaaa.webp',
    thumb: 'thumb/2026-11-03__Day__aaaaaa.webp',
    mime: 'image/webp',
    encodeMime: 'image/webp',
    source: 'viewfinder',
    bytes: 5,
    thumbBytes: 5,
    w: 1080,
    h: 1080,
    caption: 'Kam 03.11.26',
    createdAt: 3,
  })
  legacy.close()
}

async function stores(): Promise<string[]> {
  const req = indexedDB.open(NAME)
  const raw = await new Promise<IDBDatabase>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const names = [...raw.objectStoreNames]
  raw.close()
  return names
}

describe('migrasi ke skema plan versi 3', () => {
  beforeEach(seedLegacy)

  it('tabel template dan slot hilang, plan lahir kosong', async () => {
    const migrated = makeDb(NAME)
    await migrated.open()
    expect(migrated.verno).toBe(3)
    const names = await stores()
    expect(names).toContain('plans')
    expect(names).not.toContain('templates')
    expect(names).not.toContain('slots')
    expect(await migrated.plans.count()).toBe(0)
    migrated.close()
  })

  it('entri plan lama dibuang, catatan level hari dipindah ke planId null', async () => {
    const migrated = makeDb(NAME)
    await migrated.open()
    expect(await migrated.entries.get('ent_plan')).toBeUndefined()
    const day = await migrated.entries.get('ent_day')
    expect(day).toMatchObject({ id: 'ent_day', date: '2026-11-03', planId: null, note: 'catatan hari' })
    expect('slotId' in (day ?? {})).toBe(false)
    migrated.close()
  })

  it('foto dan recordnya lolos tanpa diubah', async () => {
    const migrated = makeDb(NAME)
    await migrated.open()
    const photo = await migrated.media.get('med_1')
    expect(photo).toMatchObject({ date: '2026-11-03', entryId: 'ent_day', file: 'media/2026-11-03__Day__aaaaaa.webp' })
    expect(await migrated.items.count()).toBe(0)
    expect(await migrated.checks.count()).toBe(0)
    migrated.close()
  })

  it('bisa dibuka lagi tanpa migrasi ulang', async () => {
    const first = makeDb(NAME)
    await first.open()
    await first.plans.add({ id: 'plan_1', name: 'Belajar NLP', days: [0], createdAt: 5 })
    first.close()

    const second = makeDb(NAME)
    await second.open()
    expect(await second.plans.count()).toBe(1)
    expect((await second.entries.get('ent_day'))?.planId).toBeNull()
    second.close()
  })
})
