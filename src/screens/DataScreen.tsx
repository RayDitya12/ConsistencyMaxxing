import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { bootstrap, currentBoot, onBoot, type BootState } from '../storage/bootstrap'
import { formatBytes } from '../storage/capability'
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

export function DataScreen() {
  const [boot, setBoot] = useState<BootState | null>(currentBoot())
  const counts = useLiveQuery(async () => ({
    media: await db.media.count(),
    bytes: (await db.media.toArray()).reduce((a, m) => a + m.bytes + m.thumbBytes, 0),
    entries: await db.entries.count(),
    templates: await db.templates.count(),
  }))

  useEffect(() => onBoot(setBoot), [])

  useEffect(() => {
    if (!currentBoot()) void bootstrap()
  }, [])

  const yes = (v: boolean) => (v ? 'ya' : 'tidak')

  if (!boot)
    return (
      <Screen>
        <TopBar title="Data" />
        <div className="p-4 text-[13px] text-ink-2">Memeriksa penyimpanan perangkat...</div>
      </Screen>
    )

  return (
    <Screen>
      <TopBar title="Data" right={<Button className="text-[11px] uppercase" onClick={() => void bootstrap()}>Periksa ulang</Button>} />
      <div className="flex-1 overflow-y-auto">
        <Section label="Penyimpanan di perangkat ini">
          <Row label="Ruang file privat (OPFS)" value={yes(boot.opfs)} warn={!boot.opfs} />
          <Row label="Penyimpanan persisten" value={yes(boot.persisted)} warn={!boot.persisted} />
          <Row label="Terpakai" value={formatBytes(boot.usage)} />
          <Row label="Kuota" value={formatBytes(boot.quota)} />
          <Row label="Format gambar kartu" value={boot.encode === 'image/webp' ? 'WebP' : 'JPEG'} />
          <Row label="Font kartu siap" value={yes(boot.fontsReady)} warn={!boot.fontsReady} />
          <Row label="File yatim dibersihkan" value={String(boot.orphansRemoved)} />
        </Section>
        <Section label="Isi arsip">
          <Row label="Foto" value={String(counts?.media ?? 0)} />
          <Row label="Entri" value={String(counts?.entries ?? 0)} />
          <Row label="Rencana" value={String(counts?.templates ?? 0)} />
          <Row label="Ukuran foto" value={formatBytes(counts?.bytes ?? 0)} />
        </Section>
        <Section label="Catatan">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Semua data hidup di perangkat ini saja. Kalau browser menghapus data situs, arsip ikut hilang: tidak ada
            server yang menyimpan salinan. Tombol ekspor akan muncul di sini begitu arsip bisa dibaca.
          </p>
        </Section>
      </div>
    </Screen>
  )
}
