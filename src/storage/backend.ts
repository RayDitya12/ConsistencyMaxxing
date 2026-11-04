export interface FileBackend {
  write(path: string, data: Blob): Promise<void>
  read(path: string): Promise<Blob | null>
  remove(path: string): Promise<void>
  /** nama file (bukan path penuh) per direktori, mis. 'media' */
  list(dir: string): Promise<string[]>
  lastModified(path: string): Promise<number>
  clear(): Promise<void>
}

class OpfsBackend implements FileBackend {
  private root: FileSystemDirectoryHandle | null = null

  private async dir(): Promise<FileSystemDirectoryHandle> {
    if (!this.root) this.root = await navigator.storage.getDirectory()
    return this.root
  }

  private async handle(path: string, create: boolean): Promise<FileSystemFileHandle | null> {
    const [dirName, name] = split(path)
    const parent = await (await this.dir()).getDirectoryHandle(dirName, { create })
    if (!create) {
      try {
        return await parent.getFileHandle(name, { create: false })
      } catch {
        return null
      }
    }
    return parent.getFileHandle(name, { create: true })
  }

  async write(path: string, data: Blob) {
    const h = await this.handle(path, true)
    const w = await (h as FileSystemFileHandle).createWritable()
    await w.write(data)
    await w.close()
  }

  async read(path: string) {
    const h = await this.handle(path, false)
    return h ? await h.getFile() : null
  }

  async remove(path: string) {
    const [dirName, name] = split(path)
    try {
      const parent = await (await this.dir()).getDirectoryHandle(dirName, { create: false })
      await parent.removeEntry(name)
    } catch {
      /* sudah hilang */
    }
  }

  async list(dir: string) {
    const names: string[] = []
    try {
      const sub = await (await this.dir()).getDirectoryHandle(dir, { create: false })
      for (const [name, kind] of await entries(sub)) if (kind === 'file') names.push(name)
    } catch {
      /* direktori belum pernah dibuat */
    }
    return names
  }

  async lastModified(path: string) {
    const h = await this.handle(path, false)
    return h ? (await h.getFile()).lastModified : 0
  }

  async clear() {
    const root = await this.dir()
    for (const [name] of await entries(root)) await root.removeEntry(name, { recursive: true })
  }
}

type DirLike = FileSystemDirectoryHandle & {
  values?: () => AsyncIterable<FileSystemHandle>
  entries?: () => AsyncIterable<[string, FileSystemHandle]>
}

async function entries(handle: FileSystemDirectoryHandle): Promise<[string, FileSystemHandle['kind']][]> {
  const d = handle as DirLike
  const out: [string, FileSystemHandle['kind']][] = []
  if (typeof d.entries === 'function') {
    for await (const [name, h] of d.entries()) out.push([name, h.kind])
  } else if (typeof d.values === 'function') {
    for await (const h of d.values()) out.push([(h as FileSystemFileHandle & { name?: string }).name ?? '', h.kind])
  }
  return out.filter(([name]) => name.length > 0)
}

function split(path: string): [string, string] {
  const i = path.lastIndexOf('/')
  if (i < 0) return ['root', path]
  return [path.slice(0, i), path.slice(i + 1)]
}

export class MemoryBackend implements FileBackend {
  private files = new Map<string, { blob: Blob; mtime: number }>()

  async write(path: string, data: Blob, mtime = Date.now()) {
    this.files.set(path, { blob: data, mtime })
  }
  async read(path: string) {
    return this.files.get(path)?.blob ?? null
  }
  async remove(path: string) {
    this.files.delete(path)
  }
  async list(dir: string) {
    const prefix = `${dir}/`
    return [...this.files.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length))
  }
  async lastModified(path: string) {
    return this.files.get(path)?.mtime ?? 0
  }
  async clear() {
    this.files.clear()
  }
}

let backend: FileBackend | null = null

export function supportsOpfs(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory
}

export function installBackend(next: FileBackend) {
  backend = next
}

export function getBackend(): FileBackend {
  if (!backend) {
    if (!supportsOpfs()) throw new Error('OPFS tidak tersedia di browser ini')
    backend = new OpfsBackend()
  }
  return backend
}
