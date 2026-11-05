import Dexie, { type Table } from 'dexie'
import type { Check, Entry, Item, MediaRecord, Plan } from './types'

const DB_NAME = 'consistencymaxxing'

class ConsistencyDb extends Dexie {
  plans!: Table<Plan, string>
  items!: Table<Item, string>
  entries!: Table<Entry, string>
  checks!: Table<Check, string>
  media!: Table<MediaRecord, string>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      templates: 'id, name, archivedAt',
      slots: 'id, templateId, [templateId+key]',
      items: 'id, slotId, [slotId+order]',
      entries: 'id, date, slotId, [date+slotId]',
      checks: 'key, date, itemId, [date+itemId]',
      media: 'id, date, entryId, [date+entryId]',
      meta: 'key',
    })
    // meta pernah dipakai untuk status boot; barisnya membuat 'Terpakai' tumbuh tiap diperiksa
    // ulang padahal tidak pernah dibaca. Versi 2 menghapus tabelnya dari install lama.
    this.version(2).stores({ meta: null })
    // Versi 3 membuang template + pola tujuh huruf. Entri lama menunjuk id slot yang tidak ada
    // lagi, jadi hanya yang level hari yang dipertahankan — dan dipindah ke planId null supaya
    // catatan hari itu masih ketemu. Foto dan file-nya tidak tersentuh.
    this.version(3)
      .stores({
        plans: 'id, name, createdAt',
        items: 'id, planId, [planId+order]',
        entries: 'id, date, planId, [date+planId]',
        templates: null,
        slots: null,
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        const rows: Array<Entry & { slotId?: string | null }> = await entries.toArray()
        const kept: Entry[] = []
        for (const row of rows) {
          if (row.slotId != null) {
            await entries.delete(row.id)
            continue
          }
          delete row.slotId
          kept.push({ ...row, planId: null })
        }
        await entries.bulkPut(kept)
        await tx.table('items').clear()
        await tx.table('checks').clear()
      })
  }
}

export const db = new ConsistencyDb()

/** Instalasi dengan nama sendiri, dipakai test migrasi untuk membuka database yang sudah berisi
 * baris lama lalu memaksanya naik ke skema versi 3. */
export function makeDb(name: string) {
  return new ConsistencyDb(name)
}
