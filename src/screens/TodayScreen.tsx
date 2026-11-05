import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { X } from 'lucide-react'
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
import { announceSaved } from '../lib/saved'
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
        eyebrow="Hari ini"
        title={formatLong(target)}
        right={
          <span className="num rounded-card border px-2 py-1 text-[11px] text-ink-2" style={{ borderColor: 'var(--hairline)' }}>
            {media.length} foto
          </span>
        }
      />
      <div className="flex items-end gap-6 border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
        <Streak value={logged ? weeklyStreak(logged, day.today, WEEK_THRESHOLD) : 0} unit={`minggu (${WEEK_THRESHOLD}/7)`} big />
        <Streak value={logged ? dailyStreak(logged, day.today) : 0} unit="hari berfoto" />
      </div>
      <div className="flex-1 overflow-y-auto pb-4">
        {plans.length === 0 ? (
          <Section label="Plan hari ini">
            <p className="text-[15px] leading-relaxed text-ink-2">Tidak ada plan hari ini.</p>
          </Section>
        ) : (
          <Section label={`Plan hari ini · ${photographed}/${plans.length} punya foto`}>
            <ul className="flex flex-col">
              {plans.map((p, i) => (
                <li key={p.id} className={i > 0 ? 'border-t pt-3' : ''} style={i > 0 ? { borderColor: 'var(--hairline)' } : undefined}>
                  <PlanRow
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
                </li>
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
            className="w-full resize-y rounded-card border bg-transparent p-3 text-[16px] leading-relaxed outline-none"
            style={{ borderColor: 'var(--hairline)' }}
          />
        </Section>
      </div>
      {open && (
        <PlanSheet
          date={target}
          planId={open.planId}
          label={open.label}
          records={media.filter((m) => m.entryId === statuses.get(open.planId)?.entryId)}
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
  const finish = async () => {
    await setEntryStatus(date, planId, status === 'half' ? null : 'done')
    announceSaved()
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className="touch-target flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
          <Mark status={status} />
          <span className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.02em]">{name}</span>
          <span className="eyebrow shrink-0">
            {READING[status]}
            {photos > 0 ? ` · ${photos}` : ''}
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          {status !== 'full' && (
            <button
              type="button"
              aria-label={`${name}: ${status === 'half' ? 'batalkan selesai' : 'tandai selesai tanpa foto'}`}
              onClick={() => void finish()}
              className="touch-target rounded-card px-2 text-[10px] font-bold uppercase tracking-[0.09em]"
              style={
                status === 'half'
                  ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                  : { border: '1.5px solid var(--hairline)', color: 'var(--ink-2)' }
              }
            >
              selesai
            </button>
          )}
          <button
            type="button"
            aria-label={`${name}: ${skipped ? 'batalkan lewati' : 'lewati hari ini'}`}
            onClick={() => void setEntryStatus(date, planId, skipped ? null : 'skip')}
            className="touch-target rounded-card px-2 text-[10px] font-bold uppercase tracking-[0.09em]"
            style={
              skipped
                ? { background: 'var(--ink)', color: 'var(--surface)' }
                : { border: '1.5px solid var(--hairline)', color: 'var(--ink-2)' }
            }
          >
            lewati
          </button>
        </div>
      </div>
      {items.length > 0 && (
        <div className="pb-2 pl-8">
          <ChecklistStrip date={date} items={items} checks={checks} />
        </div>
      )}
    </div>
  )
}

function PlanSheet({
  date,
  planId,
  label,
  records,
  ready,
  boot,
  onClose,
}: {
  date: string
  planId: string
  label: string
  records: MediaRecord[]
  ready: boolean
  boot: ReturnType<typeof useBoot>
  onClose: () => void
}) {
  const [askNoPhoto, setAskNoPhoto] = useState(false)

  function finish() {
    // Foto sudah menjadi bukti, jadi Selesai cukup menutup. Tanpa foto, status setengah
    // selesai harus dipilih sadar-sadar karena streak tidak ikut hidup.
    if (records.length === 0) setAskNoPhoto(true)
    else onClose()
  }

  async function finishWithoutPhoto() {
    await setEntryStatus(date, planId, 'done')
    announceSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 pb-8">
        <div className="flex items-end gap-3 border-b pb-2" style={{ borderColor: 'var(--hairline)' }}>
          <IconButton label={`Tutup ${label}`} onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <span className="eyebrow block">Plan hari ini</span>
            <h2 className="truncate text-[20px] font-bold leading-tight">{label}</h2>
          </div>
        </div>
        {ready ? (
          <CameraShutter dateKey={date} planId={planId} planLabel={label} />
        ) : (
          <StorageProblem boot={boot} />
        )}
        <div className="rounded-card border p-4" style={{ borderColor: 'var(--hairline)' }}>
          <h3 className="eyebrow mb-2">{records.length} foto plan ini</h3>
          <PhotoWall records={records} emptyText="Belum ada foto pada plan ini." />
        </div>
        <p className="text-[13px] leading-relaxed text-ink-2">
          Satu foto menutup plan ini. Tanpa foto, plan berhenti di setengah selesai dan streak tidak ikut hidup.
        </p>
        <Button variant="accent" className="w-full" onClick={finish}>
          Selesai
        </Button>
      </div>
      {askNoPhoto && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-6"
          style={{ background: 'rgba(0, 0, 0, 0.45)' }}
          onClick={() => setAskNoPhoto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Selesai tanpa foto"
            className="w-full max-w-[360px] rounded-card border p-4"
            style={{ borderColor: 'var(--hairline)', background: 'var(--raised)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-bold leading-tight">Selesai tanpa foto?</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Plan ini tercatat setengah selesai. Streak harian dan mingguan tidak ikut hidup.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent" onClick={() => void finishWithoutPhoto()}>
                Selesai tanpa foto
              </Button>
              <Button onClick={() => setAskNoPhoto(false)}>Batal</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="touch-target flex shrink-0 items-center justify-center rounded-card"
      style={{ color: 'var(--ink-2)' }}
    >
      {children}
    </button>
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
