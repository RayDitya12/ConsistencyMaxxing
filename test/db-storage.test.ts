import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import {
  allPlans,
  checksForDate,
  ensureEntry,
  entriesBetween,
  entryFor,
  itemsForPlan,
  itemsForPlans,
  loggedDates,
  mediaBetween,
  mediaForDate,
  mediaForEntry,
  plansForDate,
  setCheck,
  setEntryStatus,
} from '../src/db/queries'
import { addSubplan, createPlan, formatDays, removePlan, renameSubplan, setPlanDays, toggleDay } from '../src/plan/actions'
import { seedWorkoutExample } from '../src/plan/example'
import { checkKey } from '../src/db/types'
import { MemoryBackend, installBackend } from '../src/storage/backend'
import { deleteEntry, storeMedia, type MediaInput } from '../src/storage/vault'
import { findBrokenLinks, sweepOrphans } from '../src/storage/sweep'

async function clearAll() {
  installBackend(new MemoryBackend())
  await Promise.all([db.plans, db.items, db.entries, db.checks, db.media].map((t) => t.clear()))
}

function photo(over: Partial<MediaInput> = {}): MediaInput {
  return {
    date: '2026-11-05',
    entryId: 'ent_1',
    planLabel: 'Workout · Upper',
    encodeMime: 'image/webp',
    source: 'viewfinder',
    width: 1080,
    height: 1080,
    caption: 'Kam 05.11.26',
    card: new Blob(['card'], { type: 'image/webp' }),
    thumb: new Blob(['thumb'], { type: 'image/webp' }),
    ...over,
  }
}

describe('rencana yang ditulis sendiri', () => {
  beforeEach(clearAll)

  it('hanya plan yang memilih hari itu yang muncul', async () => {
    await createPlan('Belajar NLP', [0, 2])
    await createPlan('Kardio', [1])
    expect((await plansForDate('2026-11-02')).map((p) => p.name)).toEqual(['Belajar NLP'])
    expect((await plansForDate('2026-11-03')).map((p) => p.name)).toEqual(['Kardio'])
    expect(await plansForDate('2026-11-05')).toEqual([])
  })

  it('plan dibuat berurutan dan urutan itu yang dibaca layar', async () => {
    await createPlan('Pagi', [0])
    await createPlan('Malam', [0])
    expect((await plansForDate('2026-11-02')).map((p) => p.name)).toEqual(['Pagi', 'Malam'])
    expect((await allPlans()).map((p) => p.name)).toEqual(['Pagi', 'Malam'])
  })

  it('toggleDay menambahkan, mengurutkan, dan mencabut hari', () => {
    const picked = toggleDay([2, 0], 4)
    expect(picked).toEqual([0, 2, 4])
    expect(toggleDay(picked, 0)).toEqual([2, 4])
  })

  it('formatDays merangkai toggle jadi satu kalimat', () => {
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe('setiap hari')
    expect(formatDays([])).toBe('belum muncul di hari apa pun')
    expect(formatDays([4, 0, 2])).toBe('Sen + Rab + Jum')
  })

  it('nama rencana kosong ditolak dengan pesan yang menjelaskan', async () => {
    await expect(createPlan('   ', [0])).rejects.toThrow(/Nama rencana masih kosong/)
    expect(await db.plans.count()).toBe(0)
  })

  it('setPlanDays menyimpan toggle dan membuang indeks di luar tujuh hari', async () => {
    const plan = await createPlan('Baca', [0])
    await setPlanDays(plan.id, [3, 3, 9, -1])
    expect((await db.plans.get(plan.id))?.days).toEqual([3])
  })

  it('removePlan membuang subplan dan checklistnya, foto hari lama tetap utuh', async () => {
    const plan = await createPlan('Workout · Upper', [0])
    const item = (await addSubplan(plan.id, 'Bench press'))!
    await setCheck('2026-11-02', item.id, 'done')
    const entry = await ensureEntry('2026-11-02', plan.id)
    await storeMedia(photo({ entryId: entry.id, date: '2026-11-02', planLabel: plan.name }))

    await removePlan(plan.id)
    expect(await db.plans.count()).toBe(0)
    expect(await db.items.count()).toBe(0)
    expect(await db.checks.count()).toBe(0)
    expect(await db.media.count()).toBe(1)
    expect((await loggedDates()).has('2026-11-02')).toBe(true)
  })

  it('subplan tersusun menurut urutan ditambah, rename kosong menghapusnya', async () => {
    const plan = await createPlan('Belajar NLP', [0])
    expect(await addSubplan(plan.id, '  ')).toBeNull()
    const first = (await addSubplan(plan.id, 'Tugas'))!
    await addSubplan(plan.id, 'Reading')
    expect((await itemsForPlan(plan.id)).map((i) => i.label)).toEqual(['Tugas', 'Reading'])

    await renameSubplan(first.id, '')
    expect((await itemsForPlan(plan.id)).map((i) => i.label)).toEqual(['Reading'])
  })

  it('itemsForPlans memberi peta per plan, termasuk plan tanpa subplan', async () => {
    const a = await createPlan('A', [0])
    await createPlan('B', [0])
    await addSubplan(a.id, 'Satu')
    const map = await itemsForPlans([a.id, 'tak ada'])
    expect([...map.keys()]).toEqual([a.id, 'tak ada'])
    expect(map.get(a.id)?.map((i) => i.label)).toEqual(['Satu'])
  })
})

describe('checklist tiga status', () => {
  beforeEach(clearAll)

  it('null menghapus catatan, jadi tidak dicatat berbeda dari skip', async () => {
    await setCheck('2026-11-02', 'i1', 'done')
    await setCheck('2026-11-02', 'i2', 'skip')
    expect(await db.checks.get(checkKey('2026-11-02', 'i1'))).toMatchObject({ status: 'done' })
    await setCheck('2026-11-02', 'i1', null)
    expect(await db.checks.get(checkKey('2026-11-02', 'i1'))).toBeUndefined()
    expect(await db.checks.get(checkKey('2026-11-02', 'i2'))).toMatchObject({ status: 'skip' })
  })

  it('checklist per tanggal hanya mengambil item hari itu', async () => {
    await setCheck('2026-11-02', 'i1', 'done')
    await setCheck('2026-11-03', 'i1', 'skip')
    const checks = await checksForDate('2026-11-02')
    expect([...checks.keys()]).toEqual(['i1'])
    expect(checks.get('i1')?.status).toBe('done')
  })
})

describe('bukti foto', () => {
  beforeEach(clearAll)

  it('menulis file lebih dulu, lalu record, dan nama file memuat tanggal', async () => {
    const record = await storeMedia(photo())
    expect(record.file).toMatch(/^media\/2026-11-05__Workout-Upper__[a-z0-9]{6}\.webp$/)
    expect(await loggedDates()).toEqual(new Set(['2026-11-05']))
  })

  it('foto level hari tanpa plan tetap tercatat', async () => {
    await storeMedia(photo({ planLabel: null, date: '2026-11-08' }))
    expect((await loggedDates()).has('2026-11-08')).toBe(true)
  })

  it('rentang bukti mengisi kalender sekali jalan, terurut tanggal lalu waktu', async () => {
    await storeMedia(photo({ date: '2026-11-05' }))
    await storeMedia(photo({ date: '2026-12-01' }))
    await storeMedia(photo({ date: '2026-11-02' }))
    const rows = await mediaBetween('2026-11-01', '2026-11-30')
    expect(rows.map((r) => r.date)).toEqual(['2026-11-02', '2026-11-05'])
    expect((await mediaForDate('2026-11-05')).map((r) => r.id)).toEqual([rows[1].id])
  })

  it('file yatim dibuang, file muda dibiarkan, tautan mati terdeteksi', async () => {
    const backend = new MemoryBackend()
    installBackend(backend)
    const record = await storeMedia(photo())
    await backend.write('media/2026-11-04__Lama__zz11aa.webp', new Blob(['x']), Date.now() - 5000)
    await backend.write('media/2026-11-05__Baru__yy22bb.webp', new Blob(['y']))
    const removed = await sweepOrphans(2000)
    expect(removed).toContain('media/2026-11-04__Lama__zz11aa.webp')
    expect(removed).not.toContain('media/2026-11-05__Baru__yy22bb.webp')
    expect(await backend.read(record.file)).not.toBeNull()

    await backend.remove(record.file)
    expect((await findBrokenLinks()).map((m) => m.id)).toEqual([record.id])
  })

  it('menghapus entri ikut membuang file dan recordnya', async () => {
    const backend = new MemoryBackend()
    installBackend(backend)
    const record = await storeMedia(photo())
    await db.entries.add({ id: 'ent_1', date: '2026-11-05', planId: null, status: null, note: '', capturedAt: Date.now() })
    await deleteEntry('ent_1')
    expect(await db.media.count()).toBe(0)
    expect(await db.entries.count()).toBe(0)
    expect(await backend.read(record.file)).toBeNull()
    expect((await loggedDates()).has('2026-11-05')).toBe(false)
  })
})

describe('status plan harian', () => {
  beforeEach(clearAll)

  async function addPhoto(entryId: string, date = '2026-11-05') {
    await storeMedia(photo({ entryId, date, planLabel: null }))
  }

  it('centang tanpa foto boleh dibuat lalu dicabut sampai entrinya hilang', async () => {
    await setEntryStatus('2026-11-05', 'plan-a', 'done')
    expect((await entryFor('2026-11-05', 'plan-a'))?.status).toBe('done')
    await setEntryStatus('2026-11-05', 'plan-a', null)
    expect(await entryFor('2026-11-05', 'plan-a')).toBeUndefined()
    expect(await db.entries.count()).toBe(0)
  })

  it('mencabut centang tidak membuang entri yang sudah punya foto', async () => {
    const entry = await ensureEntry('2026-11-05', 'plan-a')
    await addPhoto(entry.id)
    await setEntryStatus('2026-11-05', 'plan-a', null)
    expect(await entryFor('2026-11-05', 'plan-a')).toBeDefined()
    expect(await mediaForEntry(entry.id)).toHaveLength(1)
  })

  it('lewati dan selesai berbagi satu entri per plan', async () => {
    await setEntryStatus('2026-11-05', 'plan-a', 'done')
    await setEntryStatus('2026-11-05', 'plan-a', 'skip')
    expect(await db.entries.count()).toBe(1)
    expect((await entryFor('2026-11-05', 'plan-a'))?.status).toBe('skip')
  })

  it('bukti level hari memakai entri dengan planId null', async () => {
    const day = await ensureEntry('2026-11-05', null)
    expect(day.planId).toBeNull()
    expect(await entryFor('2026-11-05', null)).toMatchObject({ id: day.id })
    expect(await entryFor('2026-11-05', 'plan-a')).toBeUndefined()
  })

  it('rentang tanggal mengambil entri bulan itu saja', async () => {
    await setEntryStatus('2026-11-05', 'plan-a', 'done')
    await setEntryStatus('2026-12-01', 'plan-a', 'skip')
    const rows = await entriesBetween('2026-11-01', '2026-11-30')
    expect(rows.map((r) => r.date)).toEqual(['2026-11-05'])
  })
})

describe('contoh Workout yang bisa sekali ketuk', () => {
  beforeEach(clearAll)

  it('Upper pada Senin/Rabu/Jumat, Lower pada Selasa/Sabtu, Kamis dan Minggu kosong', async () => {
    await seedWorkoutExample()
    const names = async (date: string) => (await plansForDate(date)).map((p) => p.name)
    expect(await names('2026-11-02')).toEqual(['Workout · Upper'])
    expect(await names('2026-11-03')).toEqual(['Workout · Lower'])
    expect(await names('2026-11-04')).toEqual(['Workout · Upper'])
    expect(await names('2026-11-05')).toEqual([])
    expect(await names('2026-11-06')).toEqual(['Workout · Upper'])
    expect(await names('2026-11-07')).toEqual(['Workout · Lower'])
    expect(await names('2026-11-08')).toEqual([])
  })
})
