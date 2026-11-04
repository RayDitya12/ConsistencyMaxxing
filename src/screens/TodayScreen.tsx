import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { loggedDates, slotsForDate } from '../db/queries'
import { dailyStreak, weeklyStreak } from '../db/derive'
import { formatLong, loggingDateKey, todayKey } from '../lib/dates'
import { GRACE_HOURS_AFTER_MIDNIGHT, WEEK_THRESHOLD } from '../config'
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

export function TodayScreen() {
  const day = useLoggingDay()
  const target = day?.target ?? ''
  const logged = useLiveQuery(async () => loggedDates(), [target])
  const slots = useLiveQuery(() => (target ? slotsForDate(target) : Promise.resolve([])), [target], [])
  const photos = useLiveQuery(
    () => (target ? db.media.where('date').equals(target).count() : Promise.resolve(0)),
    [target],
    0,
  )

  if (!day) return <Screen><TopBar title="Hari ini" /></Screen>

  return (
    <Screen>
      <TopBar
        title={formatLong(target)}
        right={<span className="num text-[12px] text-ink-2">{photos} foto</span>}
      />
      <div className="flex items-end justify-between border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
        <Streak value={logged ? weeklyStreak(logged, day.today, WEEK_THRESHOLD) : 0} unit={`minggu (${WEEK_THRESHOLD}/7)`} big />
        <Streak value={logged ? dailyStreak(logged, day.today) : 0} unit="hari berturut" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <Section label="Jadwal hari ini">
          {slots.length === 0 ? (
            <Empty>
              Tidak ada sesi terjadwal. Isi di tab Plan, atau tetap catat hari ini lewat foto level hari.
            </Empty>
          ) : (
            <ul>
              {slots.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b py-3" style={{ borderColor: 'var(--hairline)' }}>
                  <span className="text-[15px] font-semibold">{s.name}</span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-ink-2">
                    {s.kind === 'rest' ? 'rest' : 'aktif'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section label="Bukti hari ini">
          <Empty>
            Kamera dan kartu foto sedang dibangun. Sampai tahap itu selesai, hari ini belum bisa dicatat.
          </Empty>
        </Section>
      </div>
    </Screen>
  )
}
