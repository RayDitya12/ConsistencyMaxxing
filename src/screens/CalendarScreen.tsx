import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { checksForDate, entriesForDate, itemsForSlots, mediaBetween, mediaForDate, slotsForDate } from '../db/queries'
import { slotCoverage } from '../db/derive'
import { formatLong, monthGrid, todayKey } from '../lib/dates'
import { WEEKDAY_LABELS } from '../config'
import { PhotoWall } from '../components/PhotoWall'
import { Mark } from '../components/ChecklistStrip'
import { useBlobUrl } from '../storage/useBlobUrl'
import type { Check, Entry, Item, MediaRecord } from '../db/types'
import { Empty, Screen, TopBar } from '../components/ui'

const NO_ITEMS = new Map<string, Item[]>()
const NO_CHECKS = new Map<string, Check>()
const NO_ENTRIES: Entry[] = []

export function CalendarScreen() {
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null)
  const [today, setToday] = useState('')

  useEffect(() => {
    const sync = () => {
      const now = new Date()
      setMonth({ y: now.getFullYear(), m: now.getMonth() })
      setToday(todayKey(now))
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  if (!month) return <Screen><TopBar title="Kalender" /></Screen>
  return (
    <MonthGrid
      month={month}
      today={today}
      onStep={(delta) => setMonth((current) => (current ? shift(current, delta) : current))}
    />
  )
}

function shift(month: { y: number; m: number }, delta: number) {
  const d = new Date(month.y, month.m + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() }
}

function MonthGrid({
  month,
  today,
  onStep,
}: {
  month: { y: number; m: number }
  today: string
  onStep: (delta: number) => void
}) {
  const { cells, label } = monthGrid(month.y, month.m)
  const from = cells.find((c): c is string => Boolean(c)) ?? ''
  const to = [...cells].reverse().find((c): c is string => Boolean(c)) ?? ''
  const media = useLiveQuery(() => mediaBetween(from, to), [from, to], [])
  const [open, setOpen] = useState<string | null>(null)

  const byDate = new Map<string, MediaRecord[]>()
  for (const record of media) {
    const list = byDate.get(record.date) ?? []
    list.push(record)
    byDate.set(record.date, list)
  }
  const loggedThisMonth = byDate.size

  return (
    <Screen>
      <TopBar
        title={label}
        right={
          <span className="flex items-center gap-3">
            <button type="button" onClick={() => onStep(-1)} className="touch-target px-1 text-[13px]" aria-label="bulan sebelumnya">
              &lsaquo;
            </button>
            <span className="num text-[12px] text-ink-2">{loggedThisMonth} hari</span>
            <button type="button" onClick={() => onStep(1)} className="touch-target px-1 text-[13px]" aria-label="bulan berikutnya">
              &rsaquo;
            </button>
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="text-center text-[10px] uppercase tracking-[0.1em] text-ink-2">
              {w.slice(0, 3)}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) =>
            date ? (
              <DayCell
                key={date}
                date={date}
                records={byDate.get(date) ?? []}
                isToday={date === today}
                onOpen={() => setOpen(date)}
              />
            ) : (
              <span key={`void-${i}`} className="aspect-square" />
            ),
          )}
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-ink-2">
          Satu kotak terisi berarti hari itu punya minimal satu foto. Kotak kosong tidak dihukum: pola hanya niat.
        </p>
      </div>
      {open && <DaySheet date={open} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

function DayCell({
  date,
  records,
  isToday,
  onOpen,
}: {
  date: string
  records: MediaRecord[]
  isToday: boolean
  onOpen: () => void
}) {
  const newest = records[records.length - 1]
  const url = useBlobUrl(newest?.thumb)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${formatLong(date)}: ${records.length} foto`}
      className="flex aspect-square flex-col overflow-hidden"
      style={{
        border: isToday ? '2px solid var(--accent)' : '1px solid var(--hairline)',
        background: 'var(--surface-2)',
      }}
    >
      <span
        className="num flex h-[18px] shrink-0 items-center justify-between px-1 text-[10px] font-semibold"
        style={{ color: 'var(--ink-2)' }}
      >
        {Number(date.slice(8))}
        {records.length > 1 && <span>{records.length}</span>}
      </span>
      {url ? (
        <img src={url} alt="" className="min-h-0 w-full flex-1 object-cover" />
      ) : (
        <span className="min-h-0 flex-1" />
      )}
    </button>
  )
}

function DaySheet({ date, onClose }: { date: string; onClose: () => void }) {
  const media = useLiveQuery(() => mediaForDate(date), [date], [])
  const slots = useLiveQuery(() => slotsForDate(date), [date], [])
  const slotIds = slots.map((s) => s.id).join(',')
  const items = useLiveQuery(() => itemsForSlots(slotIds ? slotIds.split(',') : []), [slotIds], NO_ITEMS)
  const checks = useLiveQuery(() => checksForDate(date), [date], NO_CHECKS)
  const entries = useLiveQuery(() => entriesForDate(date), [date], NO_ENTRIES)
  const note = entries.find((e) => e.slotId === null)?.note ?? ''

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 pb-8">
        <div className="flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-[15px] font-semibold">{formatLong(date)}</h2>
          <button type="button" onClick={onClose} className="touch-target px-2 text-[12px] uppercase tracking-[0.14em]">
            tutup
          </button>
        </div>
        <div>
          <Heading>{media.length} foto</Heading>
          <PhotoWall records={media} emptyText="Hari itu lewat tanpa foto, dan itu dicatat apa adanya." />
        </div>
        {note && (
          <div>
            <Heading>Catatan</Heading>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{note}</p>
          </div>
        )}
        {slots.map((slot) => {
          const list = items.get(slot.id) ?? []
          if (list.length === 0) return null
          const labels = new Map(list.map((it) => [it.id, it.label]))
          const statuses = new Map(list.filter((it) => checks.has(it.id)).map((it) => [it.id, checks.get(it.id)!.status]))
          const cov = slotCoverage(labels, statuses)
          return (
            <div key={slot.id}>
              <Heading>
                {slot.name} &middot; {cov.done}/{cov.total} selesai &middot; {cov.skip} skip &middot; {cov.untracked.length} belum
              </Heading>
              <ul className="flex flex-col">
                {list.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 border-b py-2" style={{ borderColor: 'var(--hairline)' }}>
                    <Mark status={statuses.get(it.id) ?? ''} />
                    <span className="flex-1 text-[15px]">{it.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {media.length === 0 && slots.length === 0 && (
          <Empty>Hari ini tidak punya foto maupun jadwal. Kalau memang hari kosong, biarkan kosong.</Empty>
        )}
      </div>
    </div>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">{children}</h3>
  )
}
