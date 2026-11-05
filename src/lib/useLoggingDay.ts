import { useEffect, useState } from 'react'
import { GRACE_HOURS_AFTER_MIDNIGHT } from '../config'
import { loggingDateKey, todayKey } from './dates'

export interface LoggingDay {
  /** tanggal yang sedang dicatat, bisa masih kemarin selama masa tenggang */
  target: string
  /** tanggal hari ini sebenarnya */
  today: string
}

/** Hari aktif dihitung di effect, bukan saat render: sesi yang dibiarkan terbuka lewat tengah
 * malam harus pindah hari sendiri ketika dilihat lagi. */
export function useLoggingDay(): LoggingDay | null {
  const [day, setDay] = useState<LoggingDay | null>(null)
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
