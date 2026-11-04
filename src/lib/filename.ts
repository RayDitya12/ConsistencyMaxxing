const SEPARATOR = '__'

/** Nama file hanyalah metadata yang manusiawi: bisa dibaca dan terurut sendiri di dalam zip.
 * Sumber kebenaran tetap record di database, jadi label dipotong dan disisakan ASCII saja. */
export function sanitizeLabel(label: string | null | undefined): string {
  const base = (label ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^[-]+|[-]+$/g, '')
    .slice(0, 24)
  return base.length > 0 ? base : 'Day'
}

export function extensionFor(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : 'webp'
}

export function buildFileName(date: string, label: string | null, id: string, mime: string): string {
  return [date, sanitizeLabel(label), id].join(SEPARATOR) + '.' + extensionFor(mime)
}

export function mediaPath(name: string): string {
  return `media/${name}`
}

export function thumbPath(name: string): string {
  return `thumb/${name}`
}
