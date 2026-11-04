import { useEffect, useState } from 'react'
import { getBackend } from './backend'

/** URL objek untuk satu file OPFS. Dibatasi ke path yang cocok supaya baris grid tidak
 * pernah menampilkan gambar tetangganya saat path berganti. */
export function useBlobUrl(path: string | null | undefined): string | null {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(null)
  useEffect(() => {
    if (!path) return
    let created: string | null = null
    let stale = false
    void getBackend()
      .read(path)
      .then((blob) => {
        if (!blob) return
        created = URL.createObjectURL(blob)
        if (stale) URL.revokeObjectURL(created)
        else setLoaded({ path, url: created })
      })
      .catch(() => undefined)
    return () => {
      stale = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [path])
  return loaded !== null && loaded.path === path ? loaded.url : null
}
