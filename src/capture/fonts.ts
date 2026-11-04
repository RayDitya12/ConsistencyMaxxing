export const FONT_FAMILY = 'Public Sans'

const SIZES = ['400 96px', '400 44px', '400 32px', '600 96px', '600 44px', '600 32px']

export function font(spec: string): string {
  return `${spec} "${FONT_FAMILY}", system-ui, sans-serif`
}

let loaded: Promise<boolean> | null = null

/** Shutter baru boleh aktif setelah font ini ada; kalau tidak, canvas menggambar dengan fallback
 * dan caption kartu jadi jelek selamanya (raw sudah dibuang). */
export function ensureCaptionFonts(): Promise<boolean> {
  if (loaded) return loaded
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve(false)
  loaded = Promise.all(
    SIZES.map((spec) => document.fonts.load(font(spec), '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.')),
  )
    .then(() => document.fonts.ready)
    .then(() => true)
    .catch(() => false)
  return loaded
}

export function resetFontsForTest() {
  loaded = null
}
