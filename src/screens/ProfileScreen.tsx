import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { bootstrap, currentBoot, persistNow } from '../storage/bootstrap'
import { useBoot } from '../storage/useBoot'
import { formatBytes, monthsOfHeadroom } from '../storage/capability'
import { loggedDates } from '../db/queries'
import { dailyStreak, weeklyStreak } from '../db/derive'
import { useLoggingDay } from '../lib/useLoggingDay'
import { WEEK_THRESHOLD } from '../config'
import {
  applyArchive,
  buildYearArchive,
  eraseEverything,
  readArchive,
  yearsAvailable,
  type ParsedArchive,
} from '../export/backup'
import { Button, Screen, Section, Streak, TopBar } from '../components/ui'

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
      <span className="eyebrow">{label}</span>
      <span className="num text-[14px] font-bold tracking-[-0.02em]" style={warn ? { color: 'var(--danger)' } : undefined}>
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

export function ProfileScreen() {
  const [view, setView] = useState<'ringkasan' | 'pengaturan'>('ringkasan')
  if (view === 'pengaturan') return <SettingsView onBack={() => setView('ringkasan')} />
  return <SummaryView onOpenSettings={() => setView('pengaturan')} />
}

function SummaryView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const day = useLoggingDay()
  const today = day?.today ?? ''
  const logged = useLiveQuery(async () => loggedDates(), [], null)
  const counts = useLiveQuery(async () => {
    const media = await db.media.toArray()
    return {
      media: media.length,
      days: (await loggedDates()).size,
      plans: await db.plans.count(),
    }
  })
  const years = useLiveQuery(async () => yearsAvailable(), [], [])

  useEffect(() => {
    if (!currentBoot()) void bootstrap()
  }, [])

  return (
    <Screen>
      <TopBar
        eyebrow="Akun lokal"
        title="Profil"
        right={
          <Button className="text-[12px]" onClick={onOpenSettings}>
            Pengaturan
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-end gap-6 border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
          <Streak value={logged ? weeklyStreak(logged, today, WEEK_THRESHOLD) : 0} unit={`minggu (${WEEK_THRESHOLD}/7)`} big />
          <Streak value={logged ? dailyStreak(logged, today) : 0} unit="hari berfoto" />
        </div>
        <Section label="Kamu di aplikasi ini">
          <Row label="Hari tercatat" value={String(counts?.days ?? 0)} />
          <Row label="Foto tersimpan" value={String(counts?.media ?? 0)} />
          <Row label="Plan aktif" value={String(counts?.plans ?? 0)} />
          <Row label="Tahun punya isi" value={(years ?? []).join(', ') || 'belum ada'} />
        </Section>
        <Section label="Perangkat ini">
          <p className="text-[14px] leading-relaxed text-ink-2">
            Semua foto, catatan, dan plan hidup di perangkat ini saja. Tidak ada akun, tidak ada server. Yang bisa
            memindahkan datamu hanyalah arsip .cmx.zip yang kamu ekspor sendiri, jadi ekspor rutin itu bagian dari
            memakai aplikasi ini, bukan pekerjaan tambahan. Ruang terpakai, izin simpan permanen, ekspor, impor, dan
            hapus semuanya ada di Pengaturan.
          </p>
        </Section>
      </div>
    </Screen>
  )
}

function SettingsView({ onBack }: { onBack: () => void }) {
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
      plans: await db.plans.count(),
      days: (await loggedDates()).size,
    }
  })
  const years = useLiveQuery(async () => yearsAvailable(), [], [])

  useEffect(() => {
    if (!currentBoot()) void bootstrap()
  }, [])

  if (!boot)
    return (
      <Screen>
        <TopBar
          eyebrow="Profil"
          title="Pengaturan"
          right={
            <Button className="text-[12px]" onClick={onBack}>
              Profil
            </Button>
          }
        />
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
          : archive.mediaCount === 0
            ? `${archive.name} tersimpan: tanpa foto, yang ikut hanya rencana dan checklist tahun ${year} (${formatBytes(archive.bytes)}).`
            : `${archive.name} tersimpan: ${archive.mediaCount} foto, ${formatBytes(archive.bytes)}.`,
      )
    } catch (err) {
      setMessage(`Ekspor gagal: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function askPersistence() {
    const granted = await persistNow()
    setMessage(
      granted
        ? 'Izin disimpan diberikan: browser tidak akan membersihkan data ini sendiri.'
        : 'Browser belum mau memberi izin. Biasanya permintaan otomatis datang setelah aplikasi rutin dipakai.',
    )
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
      <TopBar
        eyebrow="Profil"
        title="Pengaturan"
        right={
          <span className="flex items-center gap-2">
            <Button className="text-[12px]" onClick={() => void bootstrap()}>
              Periksa ulang
            </Button>
            <Button className="text-[12px]" onClick={onBack}>
              Profil
            </Button>
          </span>
        }
      />
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
          {boot.opfs && !boot.persisted && (
            <div className="mt-3">
              <Button disabled={busy} onClick={() => void askPersistence()}>
                Minta izin simpan permanen
              </Button>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                Tanpa izin ini browser boleh menghapus datamu sendiri saat perangkat kehabisan ruang. Ekspor tetap
                wajib.
              </p>
            </div>
          )}
        </Section>

        <Section label="Isi arsip">
          <Row label="Foto" value={String(counts?.media ?? 0)} />
          <Row label="Hari tercatat" value={String(days)} />
          <Row label="Entri" value={String(counts?.entries ?? 0)} />
          <Row label="Rencana" value={String(counts?.plans ?? 0)} />
          <Row label="Ukuran foto" value={formatBytes(counts?.bytes ?? 0)} />
          <Row label="Rata-rata per hari" value={perDay === 0 ? '-' : formatBytes(perDay)} />
        </Section>

        <Section label="Ekspor">
          <div className="flex flex-wrap gap-2">
            {(years ?? []).map((year) => (
              <Button key={year} disabled={busy} onClick={() => void exportYear(year)} className="num">
                {year}
              </Button>
            ))}
          </div>
          {years?.length === 0 && (
            <p className="text-[13px] leading-relaxed text-ink-2">
              Belum ada foto, entri, atau checklist pada tahun mana pun, jadi belum ada yang bisa dibungkus.
            </p>
          )}
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
                <span className="eyebrow mb-1 block">Ketik GANTI untuk menimpa perangkat ini</span>
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="touch-target w-full rounded-card border bg-transparent px-3 py-2 text-[16px] outline-none"
                  style={{ borderColor: 'var(--hairline)' }}
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
            <span className="eyebrow mb-1 block">Ketik HAPUS untuk menyetujui</span>
            <input
              value={wipeWord}
              onChange={(e) => setWipeWord(e.target.value)}
              className="touch-target w-full rounded-card border bg-transparent px-3 py-2 text-[16px] outline-none"
              style={{ borderColor: 'var(--hairline)' }}
            />
          </label>
        </Section>

        {message && (
          <div
            className="mx-4 my-3 rounded-card border p-4 text-[13px] leading-relaxed"
            style={{ borderColor: 'var(--hairline)', background: 'var(--accent-soft)' }}
          >
            {message}
          </div>
        )}
      </div>
    </Screen>
  )
}
