import Dexie, { type Table } from 'dexie'
import type { Check, Entry, Item, MediaRecord, Slot, Template } from './types'

class ConsistencyDb extends Dexie {
  templates!: Table<Template, string>
  slots!: Table<Slot, string>
  items!: Table<Item, string>
  entries!: Table<Entry, string>
  checks!: Table<Check, string>
  media!: Table<MediaRecord, string>

  constructor() {
    super('consistencymaxxing')
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
  }
}

export const db = new ConsistencyDb()
