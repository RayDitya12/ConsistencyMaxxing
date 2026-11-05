import { strFromU8, strToU8, unzipSync, zip } from 'fflate'
import { APP_NAME, SCHEMA_VERSION } from '../config'
import { db } from '../db/db'
import { getBackend } from '../storage/backend'
import type { Check, Entry, Item, MediaRecord, Slot, Template } from '../db/types'

const MANIFEST = 'manifest.json'
const DATA = 'data.json'

export interface Manifest {
  app: string
  schemaVersion: number
  year: string
  exportedAt: number
  counts: Record<'templates' | 'slots' | 'items' | 'entries' | 'checks' | 'media', number>
}

export interface BackupData {
  templates: Template[]
  slots: Slot[]
  items: Item[]
  entries: Entry[]
  checks: Check[]
  media: MediaRecord[]
}

export interface ParsedArchive {
  manifest: Manifest
  data: BackupData
  files: Map<string, Uint8Array>
}

export interface ArchiveResult {
  name: string
  blob: Blob
  bytes: number
  mediaCount: number
  /** Foto yang recordnya ada tapi file-nya hilang di perangkat ini; tidak ikut dibungkus. */
  missingFiles: number
}

/** Tahun yang benar-benar punya isi: foto, entri, atau checklist. */
export async function yearsAvailable(): Promise<string[]> {
  const [media, entries, checks] = await Promise.all([
    db.media.toArray(),
    db.entries.toArray(),
    db.checks.toArray(),
  ])
  const years = new Set<string>()
  for (const row of [...media, ...entries, ...checks]) years.add(row.date.slice(0, 4))
  return [...years].sort()
}

function toBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buf) => new Uint8Array(buf))
}

export async function buildYearArchive(year: string): Promise<ArchiveResult> {
  const [templates, slots, items, allEntries, allChecks, allMedia] = await Promise.all([
    db.templates.toArray(),
    db.slots.toArray(),
    db.items.toArray(),
    db.entries.toArray(),
    db.checks.toArray(),
    db.media.toArray(),
  ])
  const inYear = <T extends { date: string }>(rows: T[]) => rows.filter((r) => r.date.startsWith(`${year}-`))
  const entries = inYear(allEntries)
  const checks = inYear(allChecks)

  const backend = getBackend()
  const packed: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {}
  const kept: MediaRecord[] = []
  let missingFiles = 0
  for (const record of inYear(allMedia)) {
    const card = await backend.read(record.file)
    if (!card) {
      missingFiles++
      continue
    }
    kept.push(record)
    packed[record.file] = [await toBytes(card), { level: 0 }]
    const thumb = await backend.read(record.thumb)
    if (thumb) packed[record.thumb] = [await toBytes(thumb), { level: 0 }]
  }

  const manifest: Manifest = {
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    year,
    exportedAt: Date.now(),
    counts: { templates: templates.length, slots: slots.length, items: items.length, entries: entries.length, checks: checks.length, media: kept.length },
  }
  const data: BackupData = { templates, slots, items, entries, checks, media: kept }
  packed[MANIFEST] = strToU8(JSON.stringify(manifest, null, 2))
  packed[DATA] = strToU8(JSON.stringify(data))

  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(packed, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out))),
  )
  const name = `${APP_NAME.toLowerCase()}-${year}.cmx.zip`
  return { name, blob: new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), bytes: bytes.length, mediaCount: kept.length, missingFiles }
}

export async function readArchive(file: File): Promise<ParsedArchive> {
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new Error('File ini tidak bisa dibuka sebagai arsip .cmx.zip.')
  }
  const manifestRaw = unzipped[MANIFEST]
  if (!manifestRaw) throw new Error('Arsip ini tidak punya manifest.json, jadi isinya tidak bisa dipercaya.')
  const manifest = JSON.parse(strFromU8(manifestRaw)) as Manifest
  if (manifest.app !== APP_NAME) throw new Error('Ini bukan arsip ConsistencyMaxxing.')
  if (manifest.schemaVersion > SCHEMA_VERSION)
    throw new Error(`Arsip memakai skema ${manifest.schemaVersion}; aplikasi ini baru paham skema ${SCHEMA_VERSION}.`)
  const dataRaw = unzipped[DATA]
  if (!dataRaw) throw new Error('Isi arsip (data.json) hilang.')
  const data = JSON.parse(strFromU8(dataRaw)) as BackupData
  const files = new Map(Object.entries(unzipped).filter(([name]) => name !== MANIFEST && name !== DATA))
  return { manifest, data, files }
}

export interface ImportReport {
  year: string
  media: number
  entries: number
  checks: number
  templates: number
  skipped: number
}

/** Merge: id yang sudah ada di perangkat ini menang, arsip hanya menambah yang belum ada. */
export async function applyArchive(parsed: ParsedArchive, mode: 'merge' | 'replace'): Promise<ImportReport> {
  const backend = getBackend()
  const { data, files, manifest } = parsed
  if (mode === 'replace') {
    await Promise.all([db.media.clear(), db.checks.clear(), db.entries.clear(), db.items.clear(), db.slots.clear(), db.templates.clear()])
    await backend.clear()
  }

  const report: ImportReport = { year: manifest.year, media: 0, entries: 0, checks: 0, templates: 0, skipped: 0 }
  for (const template of data.templates) {
    if (mode === 'merge' && (await db.templates.get(template.id))) {
      report.skipped++
      continue
    }
    await db.templates.add(template)
    report.templates++
  }
  for (const slot of data.slots) if (!(mode === 'merge' && (await db.slots.get(slot.id)))) await db.slots.add(slot)
  for (const item of data.items) if (!(mode === 'merge' && (await db.items.get(item.id)))) await db.items.add(item)

  for (const entry of data.entries) {
    if (mode === 'merge' && (await db.entries.get(entry.id))) {
      report.skipped++
      continue
    }
    await db.entries.add(entry)
    report.entries++
  }
  for (const check of data.checks) {
    if (mode === 'merge' && (await db.checks.get(check.key))) {
      report.skipped++
      continue
    }
    await db.checks.put(check)
    report.checks++
  }

  for (const record of data.media) {
    if (mode === 'merge' && (await db.media.get(record.id))) {
      report.skipped++
      continue
    }
    const card = files.get(record.file)
    if (!card) {
      report.skipped++
      continue
    }
    await backend.write(record.file, new Blob([card as unknown as BlobPart], { type: record.mime }))
    const thumb = files.get(record.thumb)
    if (thumb) await backend.write(record.thumb, new Blob([thumb as unknown as BlobPart], { type: record.mime }))
    await db.media.add(record)
    report.media++
  }
  return report
}

export async function eraseEverything() {
  await Promise.all([db.media.clear(), db.checks.clear(), db.entries.clear(), db.items.clear(), db.slots.clear(), db.templates.clear(), db.meta.clear()])
  await getBackend().clear()
}
