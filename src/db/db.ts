import Dexie, { type Table } from 'dexie'
import type { Check, Entry, Item, MediaRecord, Slot, Template } from './types'

export interface MetaRow {
  key: string
  value: unknown
}

class ConsistencyDb extends Dexie {
  templates!: Table<Template, string>
  slots!: Table<Slot, string>
  items!: Table<Item, string>
  entries!: Table<Entry, string>
  checks!: Table<Check, string>
  media!: Table<MediaRecord, string>
  meta!: Table<MetaRow, string>

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
  }
}

export const db = new ConsistencyDb()

export async function putMeta(key: string, value: unknown) {
  await db.meta.put({ key, value })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}
