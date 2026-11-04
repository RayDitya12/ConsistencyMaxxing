import { WEEKDAY_LABELS } from '../config'

export const DAYS_IN_WEEK = 7

export type PatternParse =
  | { ok: true; keys: string[]; distinct: string[] }
  | { ok: false; error: string }

/**
 * 'ULURULR' -> tujuh kunci slot, indeks 0 = Senin.
 * Satu huruf = satu slot. Huruf baru belum tentu punya nama; itu urusan pemanggil.
 */
export function parseWeeklyPattern(input: string): PatternParse {
  const compact = input.replace(/\s+/g, '').toUpperCase()
  if (compact.length === 0) return { ok: false, error: 'Pola masih kosong. Contoh: ULURULR.' }
  if (!/^[A-Z]+$/.test(compact))
    return { ok: false, error: 'Pola hanya boleh berisi huruf, satu huruf untuk satu hari.' }
  if (compact.length !== DAYS_IN_WEEK)
    return {
      ok: false,
      error: `Pola harus ${DAYS_IN_WEEK} huruf (Satu huruf = Satu hari). Sekarang ${compact.length}.`,
    }
  const keys = [...compact]
  return { ok: true, keys, distinct: [...new Set(keys)] }
}

export function describePattern(keys: string[], slotNames: Record<string, string>): string {
  return keys.map((k, i) => `${WEEKDAY_LABELS[i]} ${slotNames[k] ?? k}`).join(', ')
}
