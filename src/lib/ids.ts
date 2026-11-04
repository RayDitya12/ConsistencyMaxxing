export function shortId(len = 6): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, len)
}

export function newId(prefix: string): string {
  return `${prefix}_${shortId(9)}`
}
