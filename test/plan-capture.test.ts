import { describe, expect, it } from 'vitest'
import { buildFileName, extensionFor, mediaPath, sanitizeLabel, thumbPath } from '../src/lib/filename'
import { computeLayout, coverRect } from '../src/capture/layout'
import { buildCaption, truncate, wrapLines } from '../src/capture/caption'
import { thumbSize } from '../src/capture/card'
import { CAPTION_FIELDS } from '../src/capture/caption'

describe('nama file sebagai metadata yang manusiawi', () => {
  it('membuang karakter ilegal path dan emoji', () => {
    expect(sanitizeLabel('Upper/Lower *beta*')).toBe('Upper-Lower-beta')
    expect(sanitizeLabel('Belajar 🎸 Gitar')).toBe('Belajar-Gitar')
    expect(sanitizeLabel('')).toBe('Day')
    expect(sanitizeLabel('   ')).toBe('Day')
  })

  it('memotong label panjang agar path tetap pendek', () => {
    expect(sanitizeLabel('Belajar Algoritma dan Struktur Data Bab Enam')).toHaveLength(24)
  })

  it('terurut kronologis dan tidak bentrok untuk dua foto slot sama', () => {
    const a = buildFileName('2026-11-05', 'Upper', 'ab12cd', 'image/webp')
    const b = buildFileName('2026-11-05', 'Upper', 'zz99yy', 'image/webp')
    expect(a).toBe('2026-11-05__Upper__ab12cd.webp')
    expect(a).not.toBe(b)
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(mediaPath('x.webp')).toBe('media/x.webp')
    expect(thumbPath('x.webp')).toBe('thumb/x.webp')
  })
})

describe('geometri kartu', () => {
  it('jendela foto 1:1 dan ukurannya sama di kedua mode', () => {
    const p = computeLayout('portrait')
    const l = computeLayout('landscape')
    expect(p.photo.w).toBe(p.photo.h)
    expect(l.photo).toMatchObject({ w: p.photo.w, h: p.photo.h })
    expect(p.band.h).toBe(p.card.h - p.photo.h)
    expect(l.band.w).toBe(l.card.w - l.photo.w)
  })

  it('pita tidak pernah tumpang tindih dengan foto', () => {
    for (const mode of ['portrait', 'landscape'] as const) {
      const layout = computeLayout(mode)
      const overlap =
        Math.max(0, Math.min(layout.photo.x + layout.photo.w, layout.band.x + layout.band.w) - Math.max(layout.photo.x, layout.band.x)) *
        Math.max(0, Math.min(layout.photo.y + layout.photo.h, layout.band.y + layout.band.h) - Math.max(layout.photo.y, layout.band.y))
      expect(overlap).toBe(0)
    }
  })

  it('cover crop selalu menutupi jendela, termasuk untuk sumber sangat lebar', () => {
    const layout = computeLayout('portrait')
    const rect = coverRect(4000, 900, layout.photo)
    expect(rect.x).toBeLessThanOrEqual(0)
    expect(rect.x + rect.w).toBeGreaterThanOrEqual(layout.photo.w)
    expect(rect.y).toBeLessThanOrEqual(0)
    expect(rect.y + rect.h).toBeGreaterThanOrEqual(layout.photo.h)
  })

  it('thumbnail menjaga rasio kartu, bukan dipaksa jadi bujur sangkar', () => {
    expect(thumbSize(1080, 1350, 320)).toEqual({ w: 256, h: 320 })
    expect(thumbSize(1350, 1080, 320)).toEqual({ w: 320, h: 256 })
  })

  it('pan menggeser hanya sumbu yang punya ruang, zoom membuka dua-duanya', () => {    const layout = computeLayout('portrait')
    const base = coverRect(1600, 1200, layout.photo)
    const panned = coverRect(1600, 1200, layout.photo, { x: 1, y: 1 })
    expect(panned.x).toBeGreaterThan(base.x)
    expect(panned.y).toBe(base.y)

    const zoomBase = coverRect(1600, 1200, layout.photo, { x: 0, y: 0 }, 1.4)
    const zoomPan = coverRect(1600, 1200, layout.photo, { x: 1, y: 1 }, 1.4)
    expect(zoomPan.y).toBeGreaterThan(zoomBase.y)
    expect(zoomPan.x + zoomPan.w).toBeGreaterThanOrEqual(layout.photo.w)
    expect(zoomPan.y + zoomPan.h).toBeGreaterThanOrEqual(layout.photo.h)
  })
})

describe('caption kartu', () => {
  it('fase ini hanya tanggal yang dicetak', () => {
    const c = buildCaption({ dateKey: '2026-11-05', planLabel: 'Workout · Upper', weekStreak: 14, dailyStreak: 3 })
    expect(c.headline).toBe('Kam 05.11.26')
    expect(c.slot).toBeNull()
    expect(c.week).toBeNull()
    expect(c.brand).toBeNull()
    expect(CAPTION_FIELDS.date).toBe(true)
  })

  it('memotong label panjang sebelum masuk gambar', () => {
    expect(truncate('Belajar Algoritma dan Struktur Data Bab Enam Lanjutan', 34).length).toBeLessThanOrEqual(34)
  })

  it('wrapLines menutup baris terakhir ketika ada kata yang terbuang', () => {
    const fake = { measureText: (s: string) => ({ width: s.length * 10 }) }
    const lines = wrapLines(fake, 'satu dua tiga empat lima', 60, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('...')).toBe(true)
  })

  it('wrapLines membiarkan teks yang muat utuh', () => {
    const fake = { measureText: (s: string) => ({ width: s.length * 10 }) }
    expect(wrapLines(fake, 'satu dua', 200, 2)).toEqual(['satu dua'])
  })
})
