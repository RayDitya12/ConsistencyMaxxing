import { useState } from 'react'
import type { MediaRecord } from '../db/types'
import { removeMedia } from '../storage/vault'
import { useBlobUrl } from '../storage/useBlobUrl'
import { formatBytes } from '../storage/capability'
import { Button, Empty } from './ui'

export function PhotoWall({ records }: { records: MediaRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = records.find((r) => r.id === openId) ?? null

  if (records.length === 0)
    return <Empty>Belum ada foto hari ini. Satu foto sudah cukup untuk mencatat hari.</Empty>

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {records.map((r) => (
          <PhotoThumb key={r.id} record={r} onOpen={() => setOpenId(r.id)} />
        ))}
      </div>
      {open && <PhotoViewer record={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function PhotoThumb({ record, onOpen }: { record: MediaRecord; onOpen: () => void }) {
  const url = useBlobUrl(record.thumb)
  return (
    <button type="button" onClick={onOpen} className="aspect-[4/5] w-full overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
      {url ? (
        <img src={url} alt={record.caption} className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full" style={{ background: 'var(--surface-2)' }} />
      )}
    </button>
  )
}

function PhotoViewer({ record, onClose }: { record: MediaRecord; onClose: () => void }) {
  const url = useBlobUrl(record.file)
  const [removing, setRemoving] = useState(false)

  async function destroy() {
    if (!window.confirm('Hapus foto ini? Hari tanpa foto lain akan kehilangan catatan streak-nya.')) return
    setRemoving(true)
    await removeMedia(record.id)
    setRemoving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto p-4"
      style={{ background: 'var(--surface)' }}
    >
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="num text-[12px] uppercase tracking-[0.14em] text-ink-2">{record.caption}</span>
          <button type="button" onClick={onClose} className="touch-target px-2 text-[12px] uppercase tracking-[0.14em]">
            tutup
          </button>
        </div>
        {url && <img src={url} alt={record.caption} className="w-full border" style={{ borderColor: 'var(--line)' }} />}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
          <Line label="nama file" value={record.file.replace(/^media\//, '')} />
          <Line label="ukuran" value={formatBytes(record.bytes)} />
          <Line label="mode" value={record.mode === 'portrait' ? 'tegak' : 'tidur'} />
          <Line label="sumber" value={record.source === 'viewfinder' ? 'kamera' : 'berkas'} />
        </dl>
        <div>
          <Button onClick={destroy} disabled={removing}>
            {removing ? 'Menghapus…' : 'Hapus foto'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </>
  )
}
