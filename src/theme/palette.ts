export interface Palette {
  surface: string
  surface2: string
  raised: string
  ink: string
  ink2: string
  line: string
  hairline: string
  accent: string
  accentInk: string
  accentSoft: string
  acid: string
  danger: string
}

/** Cermin dari tokens.css. Dibaca dari CSS supaya warna kartu dan warna UI tidak bisa-drift. */
const FALLBACK_LIGHT: Palette = {
  surface: '#f8f7f3',
  surface2: '#efece3',
  raised: '#fdfcf8',
  ink: '#181a17',
  ink2: '#5e6258',
  line: '#181a17',
  hairline: '#d3d6ca',
  accent: '#2454df',
  accentInk: '#f8f7f3',
  accentSoft: '#e6ebfb',
  acid: '#dce87a',
  danger: '#a41f1f',
}

const CSS_NAMES: Record<keyof Palette, string> = {
  surface: '--surface',
  surface2: '--surface-2',
  raised: '--raised',
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  hairline: '--hairline',
  accent: '--accent',
  accentInk: '--accent-ink',
  accentSoft: '--accent-soft',
  acid: '--acid',
  danger: '--danger',
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
