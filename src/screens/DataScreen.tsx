import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { bootstrap, currentBoot } from '../storage/bootstrap'
import { useBoot } from '../storage/useBoot'
import { formatBytes, monthsOfHeadroom } from '../storage/capability'
import { loggedDates } from '../db/queries'
import { todayKey } from '../lib/dates'
import { applyArchive, buildYearArchive, eraseEverything, readArchive, yearsAvailable, type ParsedArchive } from '../export/backup'
import { Button, Screen, Section, TopBar } from '../components/ui'

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b py-2" style={{ borderColor: 'var(--hairline)' }}>
      <span className="text-[12px] uppercase tracking-[0.14em] text-ink-2">{label}</span>
      <span className="num text-[14px]" style={warn ? { color: 'var(--danger)' } : undefined}>
        {value}
      </span>
    </div>
  )
}

function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function headroomDisplay(months: number | null): string {
  if (months === null) return 'belum bisa dihitung'
  if (months > 120) return 'lebih dari 10 tahun'
  return `${months} bulan`
}

export function DataScreen() {
  const boot = useBoot()
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<ParsedArchive | null>(null)
  const [word, setWord] = useState('')
  const [wipeWord, setWipeWord] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const counts = useLiveQuery(async () => {
    const media = await db.media.toArray()
    const bytes = media.reduce((a, m) => a + m.bytes + m.thumbBytes, 0)
    return {
      media: media.length,
      bytes,
      entries: await db.entries.count(),
      templates: await db.templates.count(),
      days: (await loggedDates()).size,
    }
  })
  const years = useLiveQuery(async () => {
    const found = await yearsAvailable()
    const current = todayKey().slice(0, 4)
    return found.includes(current) ? found : [...found, current].sort()
  }, [], [])

  useEffect(() => {
    if (!currentBoot()) void bootstrap()
  }, [])

  if (!boot)
    return (
      <Screen>
        <TopBar title="Data" />
        <div className="p-4 text-[13px] text-ink-2">Memeriksa penyimpanan perangkat…</div>
      </Screen>
    )

  const days = counts?.days ?? 0
  const perDay = counts && days > 0 ? Math.round(counts.bytes / days) : 0
  const headroom = monthsOfHeadroom(boot.quota, boot.usage, perDay * 30)

  async function exportYear(year: string) {
    setBusy(true)
    try {
      const archive = await buildYearArchive(year)
      saveBlob(archive.name, archive.blob)
      setMessage(
        archive.missingFiles > 0
          ? `${archive.name}: ${archive.mediaCount} foto ikut, ${archive.missingFiles} record tidak punya file di perangkat ini dan tidak dibungkus.`
          : `${archive.name} tersimpan: ${archive.mediaCount} foto, ${formatBytes(archive.bytes)}.`,
      )
    } catch (err) {
      setMessage(`Ekspor gagal: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function pickFile(file: File | undefined) {
    setMessage('')
    if (!file) return
    try {
      setPending(await readArchive(file))
    } catch (err) {
      setPending(null)
      setMessage((err as Error).message)
    }
  }

  async function restore(mode: 'merge' | 'replace') {
    if (!pending) return
    setBusy(true)
    try {
      const report = await applyArchive(pending, mode)
      setMessage(
        mode === 'merge'
          ? `Ditambahkan: ${report.media} foto, ${report.entries} entri, ${report.checks} checklist. ${report.skipped} baris dilewati karena sudah ada di perangkat ini.`
          : `Perangkat ini diganti dengan arsip ${report.year}: ${report.media} foto, ${report.entries} entri.`,
      )
      setPending(null)
      setWord('')
      await bootstrap()
    } catch (err) {
      setMessage(`Pulihkan gagal: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function wipe() {
    setBusy(true)
    await eraseEverything()
    setWipeWord('')
    setMessage('Semua data di perangkat ini sudah dihapus. Tidak ada salinan di server mana pun.')
    await bootstrap()
    setBusy(false)
  }

  const yes = (v: boolean) => (v ? 'ya' : 'tidak')

  return (
    <Screen>
      <TopBar title="Data" right={<Button className="text-[11px] uppercase" onClick={() => void bootstrap()}>Periksa ulang</Button>} />
      <div className="flex-1 overflow-y-auto">
        <Section label="Penyimpanan di perangkat ini">
          <Row label="Ruang file privat (OPFS)" value={yes(boot.opfs)} warn={!boot.opfs} />
          <Row label="Penyimpanan persisten" value={yes(boot.persisted)} warn={!boot.persisted} />
          <Row label="Terpakai" value={formatBytes(boot.usage)} />
          <Row label="Kuota" value={formatBytes(boot.quota)} />
          <Row label="Sisa untuk" value={headroomDisplay(headroom)} />
          <Row label="Format gambar kartu" value={boot.encode === 'image/webp' ? 'WebP' : 'JPEG'} />
          <Row label="Font kartu siap" value={yes(boot.fontsReady)} warn={!boot.fontsReady} />
          <Row label="File yatim dibersihkan" value={String(boot.orphansRemoved)} />
        </Section>

        <Section label="Isi arsip">
          <Row label="Foto" value={String(counts?.media ?? 0)} />
          <Row label="Hari tercatat" value={String(days)} />
          <Row label="Entri" value={String(counts?.entries ?? 0)} />
          <Row label="Rencana" value={String(counts?.templates ?? 0)} />
          <Row label="Ukuran foto" value={formatBytes(counts?.bytes ?? 0)} />
          <Row label="Rata-rata per hari" value={perDay === 0 ? '-' : formatBytes(perDay)} />
        </Section>

        <Section label="Ekspor">
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <Button key={year} disabled={busy} onClick={() => void exportYear(year)} className="num">
                {year}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-2">
            Satu file .cmx.zip per tahun: plan, checklist, catatan, dan semua kartunya. Browser akan mengunduhnya
            seperti file biasa — simpan di tempat yang kamu percaya, karena inilah satu-satunya salinanmu.
          </p>
        </Section>

        <Section label="Impor">
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
          <Button onClick={() => fileRef.current?.click()}>Pilih file .cmx.zip</Button>
          {pending && (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-[13px] leading-relaxed">
                Arsip tahun {pending.manifest.year}: {pending.data.media.length} foto, {pending.data.entries.length}{' '}
                entri, {pending.data.checks.length} checklist.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="solid" disabled={busy} onClick={() => void restore('merge')}>
                  Gabungkan
                </Button>
                <Button disabled={busy || word !== 'GANTI'} onClick={() => void restore('replace')}>
                  Ganti semua
                </Button>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-ink-2">
                  Ketik GANTI untuk menimpa perangkat ini
                </span>
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="touch-target w-full border-b bg-transparent px-0 py-2 text-[16px] outline-none"
                  style={{ borderColor: 'var(--line)' }}
                />
              </label>
            </div>
          )}
        </Section>

        <Section label="Hapus semua">
          <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
            Menghapus seluruh foto, catatan, dan plan dari perangkat ini. Tidak bisa dibatalkan; ekspor dulu kalau
            masih ingin menyimpannya.
          </p>
          <Button disabled={busy || wipeWord !== 'HAPUS'} onClick={() => void wipe()}>
            Hapus semuanya
          </Button>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-ink-2">
              Ketik HAPUS untuk menyetujui
            </span>
            <input
              value={wipeWord}
              onChange={(e) => setWipeWord(e.target.value)}
              className="touch-target w-full border-b bg-transparent px-0 py-2 text-[16px] outline-none"
              style={{ borderColor: 'var(--line)' }}
            />
          </label>
        </Section>

        {message && (
          <div className="border-t-2 px-4 py-3 text-[13px] leading-relaxed" style={{ borderColor: 'var(--line)' }}>
            {message}
          </div>
        )}
      </div>
    </Screen>
  )
}
