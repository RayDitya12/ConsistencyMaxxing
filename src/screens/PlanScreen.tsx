import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { Button, Empty, Field, Screen, Section, TopBar } from '../components/ui'
import {
  addItem,
  archiveTemplate,
  createTemplate,
  moveItem,
  patternPreview,
  removeItem,
  renameItem,
  renameSlot,
  setSlotKind,
  updatePattern,
  type Domain,
} from '../plan/actions'
import { parseWeeklyPattern } from '../plan/pattern'
import type { Slot, Template } from '../db/types'
import { WEEKDAY_LABELS } from '../config'

const DOMAINS: { value: Domain; label: string }[] = [
  { value: 'workout', label: 'Latihan' },
  { value: 'study', label: 'Kuliah' },
  { value: 'skill', label: 'Skill' },
  { value: 'custom', label: 'Lainnya' },
]

export function PlanScreen() {
  const templates = useLiveQuery(
    () => db.templates.filter((t) => t.archivedAt === null).toArray(),
    [],
    [],
  )
  return (
    <Screen>
      <TopBar title="Plan" right={<span className="num text-[12px] text-ink-2">{templates.length}</span>} />
      <div className="flex-1 overflow-y-auto">
        <NewTemplate />
        {templates.length === 0 && (
          <Empty>
            Belum ada rencana. Ketik tujuh huruf, satu huruf per hari, contoh ULURULR. Aplikasi ini berangkat
            kosong: nama hari, nama sesi, dan daftarnya sepenuhnya tulisanmu.
          </Empty>
        )}
        {templates.map((t) => (
          <TemplateEditor key={t.id} template={t} />
        ))}
      </div>
    </Screen>
  )
}

function NewTemplate() {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState<Domain>('workout')
  const [pattern, setPattern] = useState('')
  const [error, setError] = useState('')

  const preview = parseWeeklyPattern(pattern)
  const submit = async () => {
    try {
      await createTemplate(name, domain, pattern)
      setName('')
      setPattern('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Section label="Rencana baru">
      <div className="space-y-4">
        <Field
          label="Nama rencana"
          value={name}
          placeholder="Workout"
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          {DOMAINS.map((d) => (
            <Button
              key={d.value}
              variant={domain === d.value ? 'solid' : 'ghost'}
              className="flex-1 text-[12px]"
              onClick={() => setDomain(d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>
        <Field
          label="Pola 7 hari"
          value={pattern}
          placeholder="ULURULR"
          autoCapitalize="characters"
          onChange={(e) => {
            setPattern(e.target.value)
            setError('')
          }}
        />
        <div className="flex justify-between text-[11px] tracking-[0.1em] text-ink-2">
          {WEEKDAY_LABELS.map((w, i) => (
            <span key={w}>{preview.ok ? `${w} ${preview.keys[i]}` : w}</span>
          ))}
        </div>
        {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        <Button variant="accent" className="w-full" disabled={!preview.ok} onClick={submit}>
          Tambah rencana
        </Button>
      </div>
    </Section>
  )
}

function TemplateEditor({ template }: { template: Template }) {
  const slots = useLiveQuery(
    () => db.slots.where('templateId').equals(template.id).toArray(),
    [template.id],
    [] as Slot[],
  )
  const [patternDraft, setPatternDraft] = useState(template.pattern.join(''))
  const [error, setError] = useState('')

  const applyPattern = async () => {
    try {
      await updatePattern(template.id, patternDraft)
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Section label={template.name}>
      <div className="space-y-4">
        <p className="text-[12px] leading-relaxed text-ink-2">{patternPreview(template.pattern, slots)}</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field
              label="Ubah pola"
              value={patternDraft}
              autoCapitalize="characters"
              onChange={(e) => setPatternDraft(e.target.value)}
            />
          </div>
          <Button onClick={applyPattern} disabled={!parseWeeklyPattern(patternDraft).ok}>
            Simpan
          </Button>
        </div>
        {error && <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        {slots.map((slot) => (
          <SlotEditor key={slot.id} slot={slot} />
        ))}
        <Button className="w-full" onClick={() => archiveTemplate(template.id)}>
          Arsipkan rencana ini
        </Button>
      </div>
    </Section>
  )
}

function SlotEditor({ slot }: { slot: Slot }) {
  const items = useLiveQuery(
    () => db.items.where('slotId').equals(slot.id).sortBy('order'),
    [slot.id],
    [],
  )
  const [draft, setDraft] = useState('')

  return (
    <div className="border p-3" style={{ borderColor: 'var(--hairline)' }}>
      <div className="mb-2 flex items-center gap-2">
        <input
          value={slot.name}
          onChange={(e) => renameSlot(slot.id, e.target.value)}
          className="min-w-0 flex-1 border-b bg-transparent py-1 text-[15px] font-semibold outline-none"
          style={{ borderColor: 'var(--line)' }}
        />
        <Button
          className="text-[11px] uppercase"
          variant={slot.kind === 'rest' ? 'solid' : 'ghost'}
          onClick={() => setSlotKind(slot.id, slot.kind === 'rest' ? 'active' : 'rest')}
        >
          {slot.kind === 'rest' ? 'Rest' : 'Aktif'}
        </Button>
      </div>
      <ul className="mb-2">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-1 border-b py-1" style={{ borderColor: 'var(--hairline)' }}>
            <input
              defaultValue={item.label}
              onBlur={(e) => renameItem(item.id, e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
            />
            <button className="touch-target px-1 text-[12px] text-ink-2" onClick={() => moveItem(item.id, -1)} disabled={i === 0} aria-label="Naik">
              ↑
            </button>
            <button className="touch-target px-1 text-[12px] text-ink-2" onClick={() => moveItem(item.id, 1)} disabled={i === items.length - 1} aria-label="Turun">
              ↓
            </button>
            <button className="touch-target px-1 text-[12px]" onClick={() => removeItem(item.id)} aria-label="Hapus">
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="tambah daftar, mis. Pull-ups"
          className="min-w-0 flex-1 border-b bg-transparent py-1 text-[14px] outline-none"
          style={{ borderColor: 'var(--hairline)' }}
        />
        <Button
          onClick={async () => {
            await addItem(slot.id, draft)
            setDraft('')
          }}
          disabled={draft.trim().length === 0}
        >
          Tambah
        </Button>
      </div>
    </div>
  )
}
