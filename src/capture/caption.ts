import { APP_NAME } from '../config'
import { formatShort, weekdayLabel } from '../lib/dates'

/** Fase sekarang hanya tanggal yang dicetak. Satu baris ke false = field muncul di kartu berikutnya
 * tanpa menyentuh renderer. */
export const CAPTION_FIELDS = {
  date: true,
  weekday: true,
  slot: false,
  weekStreak: false,
  brand: false,
} as const

export interface CaptionInput {
  dateKey: string
  planLabel: string | null
  weekStreak: number
  dailyStreak: number
}

export interface Caption {
  headline: string
  slot: string | null
  week: string | null
  brand: string | null
}

export function buildCaption(input: CaptionInput): Caption {
  const head = CAPTION_FIELDS.date ? formatShort(input.dateKey) : ''
  return {
    headline: CAPTION_FIELDS.weekday && head ? `${weekdayLabel(input.dateKey)} ${head}` : head,
    slot: CAPTION_FIELDS.slot && input.planLabel ? truncate(input.planLabel, 34) : null,
    week: CAPTION_FIELDS.weekStreak ? `W${input.weekStreak}` : null,
    brand: CAPTION_FIELDS.brand ? APP_NAME : null,
  }
}

export function captionText(c: Caption): string {
  return [c.headline, c.slot, c.week, c.brand].filter(Boolean).join(' | ')
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}`
}

export function wrapLines(
  ctx: { measureText: (s: string) => { width: number } },
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  let dropped = false
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate
      continue
    }
    if (lines.length === maxLines - 1) {
      dropped = true
      break
    }
    lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  if (dropped && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].trimEnd()}...`
  return lines.slice(0, maxLines)
}
