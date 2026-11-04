import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  checksForDate,
  ensureEntry,
  itemsForSlots,
  loggedDates,
  mediaForDate,
  setNote,
  slotsForDate,
} from '../db/queries'
import { dailyStreak, weeklyStreak } from '../db/derive'
import { formatLong, loggingDateKey, todayKey } from '../lib/dates'
import { GRACE_HOURS_AFTER_MIDNIGHT, WEEK_THRESHOLD } from '../config'
import { shutterReady } from '../storage/bootstrap'
import { useBoot } from '../storage/useBoot'
import { CameraShutter } from '../components/CameraShutter'
import { ChecklistStrip } from '../components/ChecklistStrip'
import { PhotoWall } from '../components/PhotoWall'
import { Empty, Screen, Section, Streak, TopBar } from '../components/ui'

/** Tanggal yang sedang aktif, dihitung di effect bukan saat render: sesi lewat tengah malam
 * harus pindah hari sendiri ketika aplikasi dibuka lagi. */
function useLoggingDay() {
  const [day, setDay] = useState<{ target: string; today: string } | null>(null)
  useEffect(() => {
    const compute = () =>
      setDay({
        target: loggingDateKey(new Date(), GRACE_HOURS_AFTER_MIDNIGHT),
        today: todayKey(new Date()),
      })
    compute()
    document.addEventListener('visibilitychange', compute)
    return () => document.removeEventListener('visibilitychange', compute)
  }, [])
  return day
}

const NO_MAP = new Map()
const NO_LIST: never[] = []

export function TodayScreen() {
  const day = useLoggingDay()
  const boot = useBoot()
  const [slotId, setSlotId] = useState<string | null>(null)
  const target = day?.target ?? ''

  const logged = useLiveQuery(async () => loggedDates(), [target], null)
  const slots = useLiveQuery(() => (target ? slotsForDate(target) : Promise.resolve([])), [target], [])
  const slotIds = slots.map((s) => s.id).join(',')
  const items = useLiveQuery(() => itemsForSlots(slotIds ? slotIds.split(',') : []), [slotIds], new Map())
  const checks = useLiveQuery(() => (target ? checksForDate(target) : Promise.resolve(NO_MAP)), [target], NO_MAP)
  const media = useLiveQuery(() => (target ? mediaForDate(target) : Promise.resolve(NO_LIST)), [target], NO_LIST)
  const entries = useLiveQuery(() => db.entries.where('date').equals(target).toArray(), [target], [])
  const noteEntry = entries.find((e) => e.slotId === null)

  if (!day) return <Screen><TopBar title="Hari ini" /></Screen>

  const slot = slots.find((s) => s.id === slotId) ?? null
  const ready = shutterReady(boot)

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
        <Section label="Bukti hari ini">
          {ready ? (
            <>
              <SlotChips slots={slots} value={slotId} onChange={setSlotId} />
              <div className="mt-3">
                <CameraShutter dateKey={target} slotId={slot?.id ?? null} slotLabel={slot?.name ?? null} />
              </div>
              <div className="mt-4">
                <PhotoWall records={media} />
              </div>
            </>
          ) : (
            <Empty>
              {boot?.opfs
                ? 'Font kartu masih dimuat. Tunggu sebentar lalu buka lagi.'
                : 'Penyimpanan lokal (OPFS) tidak tersedia di browser ini, jadi foto tidak bisa disimpan. Coba Chrome atau Safari terbaru.'}
            </Empty>
          )}
        </Section>
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
            className="w-full resize-y border bg-transparent p-3 text-[15px] leading-relaxed outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
        </Section>
        <Section label="Jadwal hari ini">
          {slots.length === 0 ? (
            <Empty>Tidak ada sesi terjadwal. Foto hari ini tetap tercatat; pola hanya niat, bukan paksaan.</Empty>
          ) : (
            <div className="flex flex-col gap-5">
              {slots.map((s) => (
                <div key={s.id}>
                  <h3 className="mb-2 flex items-baseline justify-between text-[13px] font-semibold uppercase tracking-[0.1em]">
                    {s.name}
                    <span className="num text-[11px] tracking-[0.14em] text-ink-2">huruf {s.key}</span>
                  </h3>
                  <ChecklistStrip date={target} items={items.get(s.id) ?? []} checks={checks} />
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Screen>
  )
}

function SlotChips({
  slots,
  value,
  onChange,
}: {
  slots: { id: string; name: string }[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  const chips: { id: string | null; name: string }[] = [{ id: null, name: 'Level hari' }, ...slots]
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {chips.map((chip) => {
        const active = chip.id === value
        return (
          <button
            key={chip.id ?? 'day'}
            type="button"
            onClick={() => onChange(chip.id)}
            className="touch-target shrink-0 px-3 text-[12px] uppercase tracking-[0.12em]"
            style={
              active
                ? { background: 'var(--ink)', color: 'var(--surface)' }
                : { border: '1px solid var(--line)', color: 'var(--ink-2)' }
            }
          >
            {chip.name}
          </button>
        )
      })}
    </div>
  )
}
