import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { checksForDate, entriesBetween, entriesForDate, itemsForPlans, mediaBetween, mediaForDate, plansForDate } from '../db/queries'
import { monthMarks, planStatuses, subplanCoverage, type DayMark, type PlanState } from '../db/derive'
import { formatLong, monthGrid, todayKey } from '../lib/dates'
import { WEEKDAY_LABELS } from '../config'
import { PhotoWall } from '../components/PhotoWall'
import { Mark } from '../components/ChecklistStrip'
import type { Check, Entry, Item } from '../db/types'
import { Button, Empty, Screen, TopBar } from '../components/ui'

const NO_ITEMS = new Map<string, Item[]>()
const NO_CHECKS = new Map<string, Check>()
const NO_ENTRIES: Entry[] = []

const READING: Record<PlanState, string> = {
  full: 'tercatat',
  half: 'tanpa foto',
  skip: 'dilewati',
  open: 'belum',
}

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

  if (!month) return <Screen><TopBar eyebrow="Rekap" title="Kalender" /></Screen>
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
  const entries = useLiveQuery(() => entriesBetween(from, to), [from, to], [])
  const [open, setOpen] = useState<string | null>(null)

  const marks = monthMarks(entries, media)
  const daysWithPhoto = [...marks.values()].filter((m) => m.photos > 0).length
  const halfOnly = [...marks.values()].filter((m) => m.mark === 'half').length

  return (
    <Screen>
      <TopBar
        eyebrow="Rekap"
        title={label}
        right={
          <span className="flex items-center gap-2">
            <button type="button" onClick={() => onStep(-1)} className="touch-target rounded-card border px-2 text-[14px]" style={{ borderColor: 'var(--hairline)' }} aria-label="bulan sebelumnya">
              &lsaquo;
            </button>
            <span className="num eyebrow">{daysWithPhoto} hari</span>
            <button type="button" onClick={() => onStep(1)} className="touch-target rounded-card border px-2 text-[14px]" style={{ borderColor: 'var(--hairline)' }} aria-label="bulan berikutnya">
              &rsaquo;
            </button>
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="eyebrow text-center">
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
                info={marks.get(date)}
                isToday={date === today}
                onOpen={() => setOpen(date)}
              />
            ) : (
              <span key={`void-${i}`} className="aspect-square" />
            ),
          )}
        </div>
        <div className="mt-4 rounded-card border p-4" style={{ borderColor: 'var(--hairline)' }}>
          <h2 className="eyebrow mb-3">Cara membaca kotak</h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] leading-relaxed text-ink-2">
            <span className="flex items-center gap-2">
              <Mark status="full" /> ada foto
            </span>
            <span className="flex items-center gap-2">
              <Mark status="half" /> centang tanpa foto ({halfOnly})
            </span>
            <span className="flex items-center gap-2">
              <Mark status="skip" /> semuanya dilewati
            </span>
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            Kotak kosong bukan hari yang gagal, dan streak hanya dihitung dari hari berfoto. Ketuk satu tanggal untuk
            melihat plan, subplan, dan fotonya.
          </p>
        </div>
      </div>
      {open && <DaySheet date={open} onClose={() => setOpen(null)} />}
    </Screen>
  )
}

function DayCell({
  date,
  info,
  isToday,
  onOpen,
}: {
  date: string
  info: DayMark | undefined
  isToday: boolean
  onOpen: () => void
}) {
  const status = info?.mark ?? ''
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${formatLong(date)}: ${info ? READING[info.mark] : 'kosong'}${info && info.photos > 1 ? `, ${info.photos} foto` : ''}`}
      className="flex aspect-square flex-col justify-between rounded-[5px] p-1"
      style={{
        border: isToday ? '1.5px solid var(--accent)' : '1px solid var(--hairline)',
        background: status === 'full' ? 'var(--surface-2)' : 'var(--raised)',
      }}
    >
      <span className="flex items-baseline justify-between">
        <span className="num text-[13px] font-bold tracking-[-0.02em]">{Number(date.slice(8))}</span>
        {info && info.photos > 0 && <span className="num eyebrow">{info.photos}</span>}
      </span>
      <Mark status={status} />
    </button>
  )
}

function DaySheet({ date, onClose }: { date: string; onClose: () => void }) {
  const plans = useLiveQuery(() => plansForDate(date), [date], [])
  const planIds = plans.map((p) => p.id).join(',')
  const items = useLiveQuery(() => itemsForPlans(planIds ? planIds.split(',') : []), [planIds], NO_ITEMS)
  const checks = useLiveQuery(() => checksForDate(date), [date], NO_CHECKS)
  const entries = useLiveQuery(() => entriesForDate(date), [date], NO_ENTRIES)
  const media = useLiveQuery(() => mediaForDate(date), [date], [])

  const statuses = planStatuses(plans, entries, media)
  const dayEntry = entries.find((e) => e.planId === null)
  const dayPhotos = media.filter((m) => m.entryId === dayEntry?.id)
  const strayPhotos = media.filter(
    (m) => m.entryId !== dayEntry?.id && ![...statuses.values()].some((s) => s.entryId === m.entryId),
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 pb-8">
        <div className="flex items-end justify-between border-b pb-2" style={{ borderColor: 'var(--hairline)' }}>
          <div>
            <span className="eyebrow block">Arsip hari</span>
            <h2 className="text-[20px] font-bold leading-tight">{formatLong(date)}</h2>
          </div>
          <Button className="text-[12px]" onClick={onClose}>
            Tutup
          </Button>
        </div>
        {plans.length === 0 && media.length === 0 && !dayEntry?.note && (
          <Empty>Hari itu tidak punya plan maupun foto. Kalau memang hari kosong, biarkan kosong.</Empty>
        )}
        {plans.map((plan) => {
          const status = statuses.get(plan.id)
          const list = items.get(plan.id) ?? []
          const labels = new Map(list.map((it) => [it.id, it.label]))
          const subStatuses = new Map(list.filter((it) => checks.has(it.id)).map((it) => [it.id, checks.get(it.id)!.status]))
          const cov = subplanCoverage(labels, subStatuses)
          const photos = media.filter((m) => m.entryId === status?.entryId)
          return (
            <div key={plan.id}>
              <Heading>
                <span className="flex items-center gap-2">
                  <Mark status={status?.state ?? 'open'} />
                  {plan.name}
                </span>
              </Heading>
              <p className="eyebrow mb-2">
                {READING[status?.state ?? 'open']}
                {status && status.photos > 0 ? ` · ${status.photos} foto` : ''}
                {list.length > 0 ? ` · subplan ${cov.done}/${cov.total}` : ''}
              </p>
              {list.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {list.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 py-1">
                      <Mark status={subStatuses.get(it.id) ?? ''} />
                      <span className="flex-1 text-[15px]">{it.label}</span>
                    </li>
                  ))}
                </ul>
              )}
              {photos.length > 0 && (
                <div className="mt-3">
                  <PhotoWall records={photos} />
                </div>
              )}
            </div>
          )
        })}
        {strayPhotos.length > 0 && (
          <div>
            <SubHeading>Foto lain pada hari itu</SubHeading>
            <PhotoWall records={strayPhotos} />
          </div>
        )}
        {dayPhotos.length > 0 && (
          <div>
            <SubHeading>Level hari</SubHeading>
            <PhotoWall records={dayPhotos} />
          </div>
        )}
        {dayEntry?.note && (
          <div>
            <SubHeading>Catatan</SubHeading>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{dayEntry.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mb-1 flex items-center gap-2 text-[16px] font-bold tracking-[-0.02em]">{children}</h3>
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="eyebrow mb-2">{children}</h3>
}
