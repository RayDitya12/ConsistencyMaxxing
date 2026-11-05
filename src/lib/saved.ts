type Listener = (message: string) => void

const listeners = new Set<Listener>()

/** Semua tulis ke IndexedDB terjadi seketika, jadi ini bukan tombol simpan melainkan bukti
 * bahwa ketikan sudah masuk. Dipisah dari komponen toast supaya fast refresh tetap jalan. */
export function announceSaved(message = 'Progress disimpan') {
  for (const listener of listeners) listener(message)
}

export function onSaved(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
