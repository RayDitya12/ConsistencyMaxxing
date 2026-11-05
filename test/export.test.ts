import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/db'
import { MemoryBackend, getBackend, installBackend } from '../src/storage/backend'
import { addSubplan, createPlan } from '../src/plan/actions'
import { ensureEntry, mediaForDate, setCheck } from '../src/db/queries'
import { storeMedia } from '../src/storage/vault'
import { applyArchive, buildYearArchive, eraseEverything, readArchive, yearsAvailable } from '../src/export/backup'

function fakeCard(): Blob {
  return new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/webp' })
}

async function seedPhoto(date: string, planLabel: string | null, planId: string | null) {
  const entry = await ensureEntry(date, planId)
  return storeMedia({
    date,
    entryId: entry.id,
    planLabel,
    card: fakeCard(),
    thumb: fakeCard(),
    encodeMime: 'image/webp',
    source: 'viewfinder',
    mode: 'portrait',
    width: 1080,
    height: 1350,
    caption: `Kam ${date.slice(8)}`,
  })
}

async function reset() {
  installBackend(new MemoryBackend())
  await Promise.all([db.plans, db.items, db.entries, db.checks, db.media].map((t) => t.clear()))
}

describe('arsip zip per tahun', () => {
  beforeEach(reset)

  async function seedYear() {
    const plan = await createPlan('Workout · Upper', [0, 2, 4])
    const item = (await addSubplan(plan.id, 'Bench press'))!
    await seedPhoto('2026-11-02', plan.name, plan.id)
    await seedPhoto('2025-12-31', plan.name, plan.id)
    return { plan, item }
  }

  it('membungkus hanya tahun yang diminta dan membaca kembali isinya', async () => {
    await seedYear()
    const archive = await buildYearArchive('2026')
    expect(archive.mediaCount).toBe(1)
    expect(archive.name).toBe('consistencymaxxing-2026.cmx.zip')
    expect(archive.blob.type).toBe('application/zip')

    const parsed = await readArchive(new File([archive.blob], archive.name))
    expect(parsed.manifest.counts.media).toBe(1)
    expect(parsed.data.media.map((m) => m.date)).toEqual(['2026-11-02'])
    expect([...parsed.files.keys()].sort()).toEqual([
      parsed.data.media[0].file,
      parsed.data.media[0].thumb,
    ].sort())

    await eraseEverything()
    expect(await db.media.count()).toBe(0)
    const report = await applyArchive(parsed, 'replace')
    expect(report.media).toBe(1)
    expect(report.plans).toBe(1)
    expect(await mediaForDate('2026-11-02')).toHaveLength(1)
    const restored = await getBackend().read(parsed.data.media[0].file)
    expect(await restored?.arrayBuffer()).toEqual((await fakeCard().arrayBuffer()))
    expect(await yearsAvailable()).toEqual(['2026'])
  })

  it('replace menulis ulang plan beserta hari-harinya', async () => {
    await seedYear()
    const parsed = await readArchive(new File([(await buildYearArchive('2026')).blob], 'x.zip'))
    await eraseEverything()
    await applyArchive(parsed, 'replace')
    expect((await db.plans.toArray()).map((p) => [p.name, p.days])).toEqual([['Workout · Upper', [0, 2, 4]]])
  })

  it('merge tidak menimpa yang sudah ada di perangkat ini', async () => {
    await seedYear()
    const archive = await buildYearArchive('2026')
    const parsed = await readArchive(new File([archive.blob], archive.name))
    const report = await applyArchive(parsed, 'merge')
    expect(report.media).toBe(0)
    expect(report.plans).toBe(0)
    expect(report.skipped).toBeGreaterThan(0)
    expect(await mediaForDate('2026-11-02')).toHaveLength(1)
  })

  it('tahun tanpa foto tapi punya checklist tetap dianggap ada isinya', async () => {
    const { item } = await seedYear()
    await setCheck('2024-03-01', item.id, 'done')
    expect(await yearsAvailable()).toEqual(['2024', '2025', '2026'])

    const archive = await buildYearArchive('2024')
    expect(archive.mediaCount).toBe(0)
    const parsed = await readArchive(new File([archive.blob], archive.name))
    expect(parsed.data.checks).toHaveLength(1)
    expect(parsed.data.entries).toHaveLength(0)
    expect(parsed.manifest.counts.plans).toBe(1)
  })

  it('record tanpa file tidak ikut dibungkus, supaya arsip tidak berisi link mati', async () => {
    await seedYear()
    await getBackend().remove((await mediaForDate('2026-11-02'))[0].file)
    const archive = await buildYearArchive('2026')
    expect(archive.mediaCount).toBe(0)
    expect(archive.missingFiles).toBe(1)
  })

  it('tolak arsip dari aplikasi lain atau skema yang lebih baru', async () => {
    await seedYear()
    const archive = await buildYearArchive('2026')
    const parsed = await readArchive(new File([archive.blob], archive.name))
    const foreignBlob = await pack({ ...parsed, manifest: { ...parsed.manifest, app: 'Strava' } })
    await expect(readArchive(new File([foreignBlob], 'x.zip'))).rejects.toThrow(/bukan arsip/i)

    const futureBlob = await pack({ ...parsed, manifest: { ...parsed.manifest, schemaVersion: 99 } })
    await expect(readArchive(new File([futureBlob], 'x.zip'))).rejects.toThrow(/skema 99/)
  })

  it('tolak arsip keluaran model lama, jangan sampai isinya masuk setengah jalan', async () => {
    await seedYear()
    const parsed = await readArchive(new File([(await buildYearArchive('2026')).blob], 'x.zip'))
    const oldBlob = await pack({ ...parsed, manifest: { ...parsed.manifest, schemaVersion: 1 } })
    await expect(readArchive(new File([oldBlob], 'x.zip'))).rejects.toThrow(/model plan sudah diganti/)
  })

  it('tolak file yang bukan arsip', async () => {
    const junk = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'bukan-zip.zip')
    await expect(readArchive(junk)).rejects.toThrow(/tidak bisa dibuka/)
  })

  it('hapus total menyisakan perangkat yang benar-benar kosong', async () => {
    const { item } = await seedYear()
    await setCheck('2026-11-02', item.id, 'done')
    expect(await db.checks.count()).toBe(1)
    await eraseEverything()
    expect(await db.plans.count()).toBe(0)
    expect(await db.media.count()).toBe(0)
    expect(await getBackend().list('media')).toEqual([])
  })
})

async function pack(parsed: { manifest: unknown; data: unknown; files: Map<string, Uint8Array> }): Promise<Blob> {
  const { strToU8, zip } = await import('fflate')
  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(parsed.manifest)),
    'data.json': strToU8(JSON.stringify(parsed.data)),
  }
  for (const [name, bytes] of parsed.files) entries[name] = bytes
  const bytes = await new Promise<Uint8Array>((resolve, reject) => zip(entries, (e, o) => (e ? reject(e) : resolve(o))))
  return new Blob([bytes as unknown as BlobPart], { type: 'application/zip' })
}
