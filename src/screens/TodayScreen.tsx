import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  checksForDate,
  ensureEntry,
  entriesForDate,
  itemsForPlans,
  loggedDates,
  mediaForDate,
  plansForDate,
  setEntryStatus,
  setNote,
} from '../db/queries'
import { dailyStreak, planStatuses, weeklyStreak, type PlanState } from '../db/derive'
import { formatLong } from '../lib/dates'
import { useLoggingDay } from '../lib/useLoggingDay'
import { WEEK_THRESHOLD } from '../config'
import type { Check, Entry, Item, MediaRecord } from '../db/types'
import { shutterReady } from '../storage/bootstrap'
import { useBoot } from '../storage/useBoot'
import { CameraShutter } from '../components/CameraShutter'
import { ChecklistStrip, Mark } from '../components/ChecklistStrip'
import { PhotoWall } from '../components/PhotoWall'
import { Button, Empty, Screen, Section, Streak, TopBar } from '../components/ui'

const NO_CHECKS = new Map<string, Check>()
const NO_ITEMS = new Map<string, Item[]>()
const NO_MEDIA: MediaRecord[] = []
const NO_ENTRIES: Entry[] = []

const READING: Record<PlanState, string> = {
  full: 'tercatat',
  half: 'tanpa foto',
  skip: 'dilewati',
  open: 'belum',
}

export function TodayScreen() {
  const day = useLoggingDay()
  const boot = useBoot()
  const [open, setOpen] = useState<{ planId: string; label: string } | null>(null)
  const target = day?.target ?? ''

  const logged = useLiveQuery(async () => loggedDates(), [target], null)
  const plans = useLiveQuery(() => (target ? plansForDate(target) : Promise.resolve([])), [target], [])
  const planIds = plans.map((p) => p.id).join(',')
  const items = useLiveQuery(() => itemsForPlans(planIds ? planIds.split(',') : []), [planIds], NO_ITEMS)
  const checks = useLiveQuery(() => (target ? checksForDate(target) : Promise.resolve(NO_CHECKS)), [target], NO_CHECKS)
  const media = useLiveQuery(() => (target ? mediaForDate(target) : Promise.resolve(NO_MEDIA)), [target], NO_MEDIA)
  const entries = useLiveQuery(() => (target ? entriesForDate(target) : Promise.resolve(NO_ENTRIES)), [target], NO_ENTRIES)

  if (!day) return <Screen><TopBar title="Hari ini" /></Screen>

  const statuses = planStatuses(plans, entries, media)
  const dayEntry = entries.find((e) => e.planId === null)
  const ready = shutterReady(boot)
  const photographed = plans.filter((p) => statuses.get(p.id)?.state === 'full').length
  const skipped = new Set(entries.filter((e) => e.planId !== null && e.status === 'skip').map((e) => e.planId as string))

  return (
    <Screen>
      <TopBar
        title={formatLong(target)}
        right={<span className="num text-[12px] text-ink-2">{media.length} foto</span>}
      />
      <div className="flex items-end justify-between border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
        <Streak value={logged ? weeklyStreak(logged, day.today, WEEK_THRESHOLD) : 0} unit={`minggu (${WEEK_THRESHOLD}/7)`} big />
        <Streak value={logged ? dailyStreak(logged, day.today) : 0} unit="hari berturut" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {plans.length === 0 ? (
          <Section label="Plan hari ini">
            <p className="py-6 text-[15px] leading-relaxed text-ink-2">Tidak ada plan hari ini.</p>
          </Section>
        ) : (
          <Section label={`Plan hari ini · ${photographed}/${plans.length} punya foto`}>
            <ul className="-mx-4 flex flex-col">
              {plans.map((p) => (
                <PlanRow
                  key={p.id}
                  date={target}
                  planId={p.id}
                  name={p.name}
                  status={statuses.get(p.id)?.state ?? 'open'}
                  skipped={skipped.has(p.id)}
                  photos={statuses.get(p.id)?.photos ?? 0}
                  items={items.get(p.id) ?? []}
                  checks={checks}
                  onOpen={() => setOpen({ planId: p.id, label: p.name })}
                />
              ))}
            </ul>
          </Section>
        )}
        {media.length > 0 && (
          <Section label="Bukti hari ini">
            <PhotoWall records={media} />
          </Section>
        )}
        <Section label="Catatan hari ini">
          <textarea
            key={`${target}`}
            defaultValue={dayEntry?.note ?? ''}
            rows={4}
            placeholder="Tulis apa saja tentang hari ini."
            onBlur={async (e) => {
              if (!dayEntry && e.target.value.trim() === '') return
              const entry = await ensureEntry(target, null)
              await setNote(entry.id, e.target.value)
            }}
            className="w-full resize-y border-2 bg-transparent p-3 text-[16px] leading-relaxed outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
        </Section>
      </div>
      {open && (
        <PlanSheet
          date={target}
          planId={open.planId}
          label={open.label}
          records={media.filter((m) => m.entryId === statuses.get(open.planId)?.entryId)}
          state={statuses.get(open.planId)?.state ?? 'open'}
          ready={ready}
          boot={boot}
          onClose={() => setOpen(null)}
        />
      )}
    </Screen>
  )
}

function PlanRow({
  date,
  planId,
  name,
  status,
  skipped,
  photos,
  items,
  checks,
  onOpen,
}: {
  date: string
  planId: string
  name: string
  status: PlanState
  skipped: boolean
  photos: number
  items: Item[]
  checks: Map<string, Check>
  onOpen: () => void
}) {
  return (
    <li className="border-b px-4" style={{ borderColor: 'var(--hairline)' }}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className="touch-target flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
          <Mark status={status} />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</span>
          <span className="num shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink-2">
            {READING[status]}
            {photos > 0 ? ` · ${photos}` : ''}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${name}: ${skipped ? 'batalkan lewati' : 'lewati hari ini'}`}
          onClick={() => void setEntryStatus(date, planId, skipped ? null : 'skip')}
          className="touch-target shrink-0 px-2 text-[11px] uppercase tracking-[0.12em]"
          style={
            skipped
              ? { background: 'var(--ink)', color: 'var(--surface)' }
              : { border: '2px solid var(--hairline)', color: 'var(--ink-2)' }
          }
        >
          lewati
        </button>
      </div>
      {items.length > 0 && (
        <div className="pb-3">
          <ChecklistStrip date={date} items={items} checks={checks} />
        </div>
      )}
    </li>
  )
}

function PlanSheet({
  date,
  planId,
  label,
  records,
  state,
  ready,
  boot,
  onClose,
}: {
  date: string
  planId: string
  label: string
  records: MediaRecord[]
  state: PlanState
  ready: boolean
  boot: ReturnType<typeof useBoot>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 pb-8">
        <div className="flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-[15px] font-semibold">{label}</h2>
          <button type="button" onClick={onClose} className="touch-target px-2 text-[12px] uppercase tracking-[0.14em]">
            tutup
          </button>
        </div>
        {ready ? (
          <CameraShutter dateKey={date} planId={planId} planLabel={label} />
        ) : (
          <StorageProblem boot={boot} />
        )}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
            {records.length} foto plan ini
          </h3>
          <PhotoWall records={records} emptyText="Belum ada foto pada plan ini." />
        </div>
        <p className="text-[12px] leading-relaxed text-ink-2">
          Satu foto menutup plan ini. Tanpa foto, plan berhenti di setengah selesai dan streak tidak ikut hidup.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await setEntryStatus(date, planId, 'done')
              onClose()
            }}
          >
            Catat tanpa foto
          </Button>
          {state === 'half' && (
            <Button
              onClick={async () => {
                await setEntryStatus(date, planId, null)
                onClose()
              }}
            >
              Cabut centang
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function StorageProblem({ boot }: { boot: ReturnType<typeof useBoot> }) {
  return (
    <Empty>
      {boot?.opfs
        ? 'Font kartu masih dimuat. Tunggu sebentar lalu buka lagi.'
        : 'Penyimpanan lokal (OPFS) tidak tersedia di browser ini, jadi foto tidak bisa disimpan. Coba Chrome atau Safari terbaru, dan buka lewat HTTPS.'}
    </Empty>
  )
}
