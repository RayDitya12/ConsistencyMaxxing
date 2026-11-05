import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  checksForDate,
  ensureEntry,
  entriesForDate,
  itemsForSlots,
  loggedDates,
  mediaForDate,
  setEntryStatus,
  setNote,
  slotsForDate,
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
  const [open, setOpen] = useState<{ slotId: string | null; label: string | null } | null>(null)
  const target = day?.target ?? ''

  const logged = useLiveQuery(async () => loggedDates(), [target], null)
  const slots = useLiveQuery(() => (target ? slotsForDate(target) : Promise.resolve([])), [target], [])
  const slotIds = slots.map((s) => s.id).join(',')
  const items = useLiveQuery(() => itemsForSlots(slotIds ? slotIds.split(',') : []), [slotIds], NO_ITEMS)
  const checks = useLiveQuery(() => (target ? checksForDate(target) : Promise.resolve(NO_CHECKS)), [target], NO_CHECKS)
  const media = useLiveQuery(() => (target ? mediaForDate(target) : Promise.resolve(NO_MEDIA)), [target], NO_MEDIA)
  const entries = useLiveQuery(() => (target ? entriesForDate(target) : Promise.resolve(NO_ENTRIES)), [target], NO_ENTRIES)

  if (!day) return <Screen><TopBar title="Hari ini" /></Screen>

  const statuses = planStatuses(slots, entries, media)
  const noteEntry = entries.find((e) => e.slotId === null)
  const dayEntryId = noteEntry?.id ?? null
  const ready = shutterReady(boot)
  const photographed = slots.filter((s) => statuses.get(s.id)?.state === 'full').length
  const skipMarks = new Set(entries.filter((e) => e.slotId !== null && e.status === 'skip').map((e) => e.slotId as string))

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
        <Section label={`Plan hari ini · ${photographed}/${slots.length} punya foto`}>
          {slots.length === 0 ? (
            <>
              <Empty>
                Tidak ada plan terjadwal hari ini. Satu foto tanpa plan tetap tercatat sebagai hari yang
                dilakoni.
              </Empty>
              {ready ? (
                <CameraShutter dateKey={target} slotId={null} slotLabel={null} />
              ) : (
                <StorageProblem boot={boot} />
              )}
            </>
          ) : (
            <ul className="-mx-4 flex flex-col">
              {slots.map((s) => (
                <PlanRow
                  key={s.id}
                  date={target}
                  slotId={s.id}
                  name={s.name}
                  status={statuses.get(s.id)?.state ?? 'open'}
                  skipped={skipMarks.has(s.id)}
                  photos={statuses.get(s.id)?.photos ?? 0}
                  items={items.get(s.id) ?? []}
                  checks={checks}
                  onOpen={() => setOpen({ slotId: s.id, label: s.name })}
                />
              ))}
            </ul>
          )}
        </Section>
        {media.length > 0 && (
          <Section label="Bukti hari ini">
            <PhotoWall records={media} />
          </Section>
        )}
        <Section label="Catatan hari ini">
          <textarea
            key={`${target}`}
            defaultValue={noteEntry?.note ?? ''}
            rows={4}
            placeholder="Tulis apa saja tentang hari ini."
            onBlur={async (e) => {
              if (!noteEntry && e.target.value.trim() === '') return
              const entry = await ensureEntry(target, null)
              await setNote(entry.id, e.target.value)
            }}
            className="w-full resize-y border bg-transparent p-3 text-[16px] leading-relaxed outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
        </Section>
      </div>
      {open && (
        <PlanSheet
          date={target}
          slotId={open.slotId}
          label={open.label ?? 'Level hari'}
          records={media.filter((m) => m.entryId === (open.slotId ? statuses.get(open.slotId)?.entryId : dayEntryId))}
          state={open.slotId ? statuses.get(open.slotId)?.state ?? 'open' : 'open'}
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
  slotId,
  name,
  status,
  skipped,
  photos,
  items,
  checks,
  onOpen,
}: {
  date: string
  slotId: string
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
          onClick={() => void setEntryStatus(date, slotId, skipped ? null : 'skip')}
          className="touch-target shrink-0 px-2 text-[11px] uppercase tracking-[0.12em]"
          style={
            skipped
              ? { background: 'var(--ink)', color: 'var(--surface)' }
              : { border: '1px solid var(--hairline)', color: 'var(--ink-2)' }
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
  slotId,
  label,
  records,
  state,
  ready,
  boot,
  onClose,
}: {
  date: string
  slotId: string | null
  label: string
  records: MediaRecord[]
  state: PlanState
  ready: boolean
  boot: ReturnType<typeof useBoot>
  onClose: () => void
}) {
  async function catatTanpaFoto() {
    if (!slotId) return
    await setEntryStatus(date, slotId, 'done')
    onClose()
  }

  async function cabut() {
    if (!slotId) return
    await setEntryStatus(date, slotId, null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 pb-8">
        <div className="flex items-baseline justify-between border-b-2 pb-2" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-[15px] font-semibold">{label}</h2>
          <button type="button" onClick={onClose} className="touch-target px-2 text-[12px] uppercase tracking-[0.14em]">
            tutup
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-2">
          {slotId
            ? 'Satu foto menutup plan ini. Tanpa foto, plan berhenti di setengah selesai dan streak tidak ikut hidup.'
            : 'Hari tanpa plan tetap boleh punya bukti.'}
        </p>
        {ready ? (
          <CameraShutter dateKey={date} slotId={slotId} slotLabel={slotId ? label : null} autoStart />
        ) : (
          <StorageProblem boot={boot} />
        )}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
            {records.length} foto plan ini
          </h3>
          <PhotoWall records={records} emptyText="Belum ada foto pada plan ini." />
        </div>
        {slotId && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void catatTanpaFoto()}>Catat tanpa foto</Button>
            {state === 'half' && <Button onClick={() => void cabut()}>Cabut centang</Button>}
          </div>
        )}
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
