import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateKey,
  diffDays,
  formatShort,
  loggingDateKey,
  monthGrid,
  weekStartKey,
  weekdayIndex,
} from '../src/lib/dates'
import { buildLoggedSet, dailyStreak, loggedInWeek, monthMarks, planStatuses, slotCoverage, weeklyStreak } from '../src/db/derive'
import type { Entry, MediaRecord } from '../src/db/types'

describe('kunci tanggal lokal', () => {
  it('memakai zona waktu lokal, bukan UTC', () => {
    const lateNight = new Date(2026, 10, 5, 23, 30)
    expect(dateKey(lateNight)).toBe('2026-11-05')
  })

  it('mengoordinasikan masa tenggang setelah tengah malam ke tanggal kemarin', () => {
    expect(loggingDateKey(new Date(2026, 10, 6, 0, 40), 2)).toBe('2026-11-05')
    expect(loggingDateKey(new Date(2026, 10, 6, 2, 30), 2)).toBe('2026-11-06')
  })

  it('Senin = indeks 0', () => {
    expect(weekdayIndex('2026-11-02')).toBe(0)
    expect(weekdayIndex('2026-11-08')).toBe(6)
  })

  it('minggu dimulai Senin dan bertahan lintas tahun', () => {
    expect(weekStartKey('2026-11-05')).toBe('2026-11-02')
    expect(weekStartKey('2026-11-01')).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(diffDays('2026-02-25', '2026-03-02')).toBe(5)
  })

  it('format tanggal pendek memakai titik, bukan garis miring', () => {
    expect(formatShort('2026-11-05')).toBe('05.11.26')
  })

  it('grid bulan selalu panjangan kelipatan 7', () => {
    const grid = monthGrid(2026, 10)
    expect(grid.cells.length % 7).toBe(0)
    expect(grid.cells.filter(Boolean).length).toBe(30)
  })
})

describe('streak', () => {
  const logged = buildLoggedSet(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06', '2026-10-07'])

  it('hari berjalan belum tercatat tidak menjatuhkan angka ke nol siang hari', () => {
    expect(dailyStreak(logged, '2026-10-07')).toBe(2)
    expect(dailyStreak(logged, '2026-10-08')).toBe(2)
    expect(dailyStreak(logged, '2026-10-09')).toBe(0)
  })

  it('streak mingguan ambang 1 menghitung minggu berturut sejak awal', () => {
    expect(weeklyStreak(logged, '2026-10-07', 1)).toBe(2)
    expect(weeklyStreak(buildLoggedSet(['2026-10-01']), '2026-10-01', 1)).toBe(1)
    expect(weeklyStreak(buildLoggedSet([]), '2026-10-07', 1)).toBe(0)
  })

  it('ambang yang lebih tinggi menolak minggu yang bolong', () => {
    expect(weeklyStreak(logged, '2026-10-07', 3)).toBe(1)
    expect(loggedInWeek(logged, '2026-10-05')).toBe(2)
    expect(loggedInWeek(logged, '2026-09-28')).toBe(3)
  })

  it('minggu berjalan yang belum lolos ambang dihitung dari minggu lalu', () => {
    const sparse = buildLoggedSet(['2026-09-28', '2026-09-29', '2026-10-05'])
    expect(weeklyStreak(sparse, '2026-10-06', 2)).toBe(1)
  })
})

describe('cakupan slot', () => {
  const items = new Map([
    ['i1', 'Pull-ups'],
    ['i2', 'Push-ups'],
    ['i3', 'Bicep curl'],
  ])

  it('memisahkan skip dari tidak dicatat', () => {
    const coverage = slotCoverage(items, new Map([
      ['i1', 'done' as const],
      ['i2', 'skip' as const],
    ]))
    expect(coverage).toEqual({ total: 3, done: 1, skip: 1, untracked: ['Bicep curl'] })
  })

  it('hari tanpa satu tick pun bukan hari yang gagal', () => {
    expect(slotCoverage(items, new Map()).untracked).toHaveLength(3)
  })
})

describe('keadaan plan per hari', () => {
  const entry = (over: Partial<Entry> = {}): Entry => ({
    id: 'entry-1',
    date: '2026-11-05',
    slotId: 'slot-a',
    status: null,
    note: '',
    capturedAt: 0,
    ...over,
  })
  const photo = (over: Partial<MediaRecord> = {}): MediaRecord => ({
    id: 'media-1',
    date: '2026-11-05',
    entryId: 'entry-1',
    file: 'media/a.webp',
    thumb: 'thumb/a.webp',
    mime: 'image/webp',
    encodeMime: 'image/webp',
    source: 'viewfinder',
    bytes: 100,
    thumbBytes: 10,
    w: 1080,
    h: 1350,
    mode: 'portrait',
    caption: '5 Nov',
    createdAt: 0,
    ...over,
  })
  const slots = [{ id: 'slot-a' }, { id: 'slot-b' }]

  it('foto mengalahkan centang tanpa foto', () => {
    const statuses = planStatuses(slots, [entry({ status: 'done' })], [photo()])
    expect(statuses.get('slot-a')).toEqual({ state: 'full', photos: 1, entryId: 'entry-1' })
  })

  it('centang tanpa foto terpisah dari plan yang belum disentuh', () => {
    const statuses = planStatuses(slots, [entry({ status: 'done' }), entry({ id: 'entry-2', slotId: 'slot-b', status: 'skip' })], [])
    expect(statuses.get('slot-a')?.state).toBe('half')
    expect(statuses.get('slot-b')?.state).toBe('skip')
    expect(planStatuses(slots, [], []).get('slot-a')?.state).toBe('open')
  })

  it('entri level hari tidak dianggap sebuah plan', () => {
    const statuses = planStatuses(slots, [entry({ slotId: null })], [])
    expect(statuses.get('slot-a')).toEqual({ state: 'open', photos: 0, entryId: null })
  })

  it('grid bulan menandai foto lebih tinggi daripada centang setengah', () => {
    const marks = monthMarks(
      [entry({ status: 'done' }), entry({ id: 'entry-2', date: '2026-11-06', slotId: 'slot-b', status: 'skip' })],
      [photo({ date: '2026-11-06', entryId: 'entry-2' })],
    )
    expect(marks.get('2026-11-05')).toEqual({ mark: 'half', photos: 0, plans: 1 })
    expect(marks.get('2026-11-06')).toEqual({ mark: 'full', photos: 1, plans: 1 })
  })

  it('hari yang hanya berisi skip tetap terbaca sebagai skip', () => {
    const marks = monthMarks([entry({ slotId: 'slot-b', status: 'skip' })], [])
    expect(marks.get('2026-11-05')).toEqual({ mark: 'skip', photos: 0, plans: 1 })
  })

  it('hari tanpa keputusan tidak muncul di peta', () => {
    expect(monthMarks([entry()], []).size).toBe(0)
    expect(monthMarks([], [photo()]).get('2026-11-05')).toEqual({ mark: 'full', photos: 1, plans: 0 })
  })
})
