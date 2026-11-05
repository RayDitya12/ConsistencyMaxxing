import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { ensureSlot, loggedDates, setCheck, slotsForDate } from '../src/db/queries'
import { createTemplate } from '../src/plan/actions'
import { checkKey, type Template } from '../src/db/types'
import { MemoryBackend, installBackend } from '../src/storage/backend'
import { deleteEntry, storeMedia } from '../src/storage/vault'
import { findBrokenLinks, sweepOrphans } from '../src/storage/sweep'
import { newId } from '../src/lib/ids'

async function seedTemplate(name: string, pattern: string[]): Promise<Template> {
  const template: Template = {
    id: newId('tpl'),
    name,
    domain: 'workout',
    pattern,
    color: '#e8540c',
    createdAt: Date.now(),
    archivedAt: null,
  }
  await db.templates.add(template)
  return template
}

async function clearAll() {
  installBackend(new MemoryBackend())
  await Promise.all([db.templates, db.slots, db.items, db.entries, db.checks, db.media].map((t) => t.clear()))
}

describe('rencana mingguan', () => {
  beforeEach(clearAll)

  it('dua template aktif memberi slot yang berbeda pada hari yang sama', async () => {
    const gym = await seedTemplate('Workout', ['U', 'L', 'U', 'R', 'U', 'L', 'R'])
    const campus = await seedTemplate('Kuliah', ['D', 'S', 'D', '-', 'S', '-', '-'].map((c) => (c === '-' ? '' : c)))
    await ensureSlot(gym.id, 'U', 'Upper')
    await ensureSlot(gym.id, 'L', 'Lower')
    await ensureSlot(gym.id, 'R', 'Rest')
    await ensureSlot(campus.id, 'D', 'Data Structures')
    const monday = await slotsForDate('2026-11-02')
    expect(monday.map((s) => s.name).sort()).toEqual(['Data Structures', 'Upper'])
    const thursday = await slotsForDate('2026-11-05')
    expect(thursday.map((s) => s.name)).toEqual(['Rest'])
  })

  it('ensureSlot idempoten, jadi pola bisa diketik ulang tanpa duplikat', async () => {
    const t = await seedTemplate('Workout', ['U', 'U', 'U', 'U', 'U', 'U', 'U'])
    const first = await ensureSlot(t.id, 'U', 'Upper')
    const second = await ensureSlot(t.id, 'U', 'Upper')
    expect(second.id).toBe(first.id)
    expect(await db.slots.count()).toBe(1)
  })

  it('huruf R lahir sebagai slot rest, bukan slot aktif yang bernama Rest', async () => {
    await createTemplate('Workout', 'workout', 'ULURULX')
    const byKey = Object.fromEntries((await db.slots.toArray()).map((s) => [s.key, s]))
    expect(byKey.R.kind).toBe('rest')
    expect(byKey.U.kind).toBe('active')
    expect(byKey.X).toMatchObject({ kind: 'active', name: 'X' })
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
})

describe('bukti foto', () => {
  beforeEach(clearAll)

  const input = {
    date: '2026-11-05',
    entryId: 'ent_1',
    slotLabel: 'Upper',
    encodeMime: 'image/webp' as const,
    source: 'viewfinder' as const,
    mode: 'portrait' as const,
    width: 1080,
    height: 1350,
    caption: 'Kam 05.11.26',
    card: new Blob(['card'], { type: 'image/webp' }),
    thumb: new Blob(['thumb'], { type: 'image/webp' }),
  }

  it('menulis file lebih dulu, lalu record, dan nama file memuat tanggal', async () => {
    const record = await storeMedia(input)
    expect(record.file).toMatch(/^media\/2026-11-05__Upper__[a-z0-9]{6}\.webp$/)
    expect(await loggedDates()).toEqual(new Set(['2026-11-05']))
  })

  it('hari Rest dengan foto level hari tetap tercatat', async () => {
    await storeMedia({ ...input, slotLabel: null, date: '2026-11-08' })
    const dates = await loggedDates()
    expect(dates.has('2026-11-08')).toBe(true)
  })

  it('file yatim dibuang, file muda dibiarkan, tautan mati terdeteksi', async () => {
    const backend = new MemoryBackend()
    installBackend(backend)
    const record = await storeMedia(input)
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
    const record = await storeMedia(input)
    await db.entries.add({ id: 'ent_1', date: input.date, slotId: null, note: '', capturedAt: Date.now() })
    await deleteEntry('ent_1')
    expect(await db.media.count()).toBe(0)
    expect(await db.entries.count()).toBe(0)
    expect(await backend.read(record.file)).toBeNull()
    expect((await loggedDates()).has(input.date)).toBe(false)
  })
})
