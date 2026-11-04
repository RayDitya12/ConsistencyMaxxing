export interface Palette {
  surface: string
  surface2: string
  ink: string
  ink2: string
  line: string
  accent: string
  accentInk: string
}

/** Cermin dari tokens.css. Dibaca dari CSS supaya warna kartu dan warna UI tidak bisa-drift. */
const FALLBACK_LIGHT: Palette = {
  surface: '#f2f2f0',
  surface2: '#e4e4e1',
  ink: '#111111',
  ink2: '#5c5c58',
  line: '#111111',
  accent: '#e8540c',
  accentInk: '#ffffff',
}

const CSS_NAMES: Record<keyof Palette, string> = {
  surface: '--surface',
  surface2: '--surface-2',
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  accent: '--accent',
  accentInk: '--accent-ink',
}

export function paletteFromDocument(doc?: Document): Palette {
  if (!doc || typeof getComputedStyle !== 'function') return FALLBACK_LIGHT
  const styles = getComputedStyle(doc.documentElement)
  const read = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim()
    return value.length > 0 ? value : fallback
  }
  const out = {} as Palette
  for (const key of Object.keys(CSS_NAMES) as (keyof Palette)[]) {
    out[key] = read(CSS_NAMES[key], FALLBACK_LIGHT[key])
  }
  return out
}

export const FALLBACK_PALETTE = FALLBACK_LIGHT
