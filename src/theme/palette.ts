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
  surface: '#e6e9ef',
  surface2: '#dce0e8',
  raised: '#eff1f5',
  ink: '#4c4f69',
  ink2: '#5c5f77',
  line: '#4c4f69',
  hairline: '#ccd0da',
  accent: '#8839ef',
  accentInk: '#eff1f5',
  accentSoft: '#e3dbf4',
  acid: '#40a02b',
  danger: '#d20f39',
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
