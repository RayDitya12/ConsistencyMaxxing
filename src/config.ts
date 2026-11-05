export const APP_NAME = 'ConsistencyMaxxing'

export const SCHEMA_VERSION = 2

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/** Ambang streak mingguan: minimal sekian hari tercatat dalam satu minggu. */
export const WEEK_THRESHOLD = 1

/** Sesi lewat tengah malam masih boleh dicatat atas tanggal kemarin. */
export const GRACE_HOURS_AFTER_MIDNIGHT = 2

export const CARD = {
  portrait: { w: 1080, h: 1350 },
  landscape: { w: 1350, h: 1080 },
  /** Jendela foto dibatasi 1:1 di kedua mode supaya crop tidak berubah saat memutar HP. */
  photoWindow: 1080,
  bandPortrait: 270,
  bandLandscapeStart: 270,
  thumbEdge: 320,
  quality: 0.82,
} as const

export type CardMode = 'portrait' | 'landscape'

export function cardSize(mode: CardMode) {
  return mode === 'portrait' ? CARD.portrait : CARD.landscape
}
