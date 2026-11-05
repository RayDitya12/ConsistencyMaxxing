export const FONT_FAMILY = 'Hanken Grotesk'

/** Bobot yang benar-benar digambar ke kartu. Font ini variable (400..800), jadi tiap angka di
 * bawah adalah sumbu berat yang harus diminta ke document.fonts sebelum rana boleh hidup. */
const SIZES = ['800 76px', '600 26px', '800 44px']

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
