import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { announceSaved } from '../lib/saved'
import { Button, IconButton, Screen, TopBar } from '../components/ui'
import {
  addSubplan,
  createPlan,
  moveSubplan,
  removePlan,
  removeSubplan,
  renamePlan,
  renameSubplan,
  setPlanDays,
  toggleDay,
} from '../plan/actions'
import { seedWorkoutExample } from '../plan/example'
import { allPlans, itemsForPlan } from '../db/queries'
import { ALL_DAYS, WEEKDAY_LABELS } from '../config'
import type { Item, Plan } from '../db/types'

export function PlanScreen() {
  const plans = useLiveQuery(() => allPlans(), [], [])
  const [adding, setAdding] = useState(false)

  return (
    <Screen>
      <TopBar
        eyebrow="atur waktu"
        title="Plan"
        right={
          <IconButton
            label={adding ? 'Tutup form rencana' : 'Tambah rencana'}
            onClick={() => setAdding((open) => !open)}
          >
            {adding ? <X size={20} strokeWidth={1.75} /> : <Plus size={20} strokeWidth={1.75} />}
          </IconButton>
        }
      />
      <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6 pt-3">
        {adding && <NewPlan onDone={() => setAdding(false)} />}
        {plans.length === 0 && !adding && <NoPlans onAdd={() => setAdding(true)} />}
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </Screen>
  )
}

function NoPlans({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-card border border-dashed p-5" style={{ borderColor: 'var(--hairline)' }}>
      <h2 className="text-[17px] font-bold leading-tight">Belum ada rencana</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        Satu rencana itu namanya plus hari-hari ia muncul. Semuanya tulisanmu sendiri, tidak ada yang dibuat
        otomatis.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="accent" onClick={onAdd}>
          Tambah rencana
        </Button>
        <Button onClick={() => void seedWorkoutExample()}>Isi contoh: Workout</Button>
      </div>
    </div>
  )
}

function NewPlan({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [error, setError] = useState('')

  const save = async () => {
    try {
      await createPlan(name, days)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="rounded-card border bg-raised p-4" style={{ borderColor: 'var(--accent)' }}>
      <span className="eyebrow mb-2 block">Rencana baru</span>
      <input
        value={name}
        autoFocus
        placeholder="Nama rencana"
        aria-label="Nama rencana"
        onChange={(e) => {
          setName(e.target.value)
          setError('')
        }}
        className="w-full bg-transparent text-[19px] font-bold tracking-[-0.025em] outline-none placeholder:text-ink-2"
      />
      <DayPicker
        days={days}
        onToggle={(i) => setDays((current) => toggleDay(current, i))}
        onAll={() => setDays(days.length === ALL_DAYS.length ? [] : [...ALL_DAYS])}
      />
      {days.length === 0 && <p className="mt-2 text-[12px] text-ink-2">Rencana belum muncul di hari apa pun.</p>}
      {error && (
        <p className="mt-2 text-[13px]" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="accent" className="flex-1" onClick={() => void save()}>
          Simpan
        </Button>
        <Button onClick={onDone}>Batal</Button>
      </div>
    </section>
  )
}

function DayPicker({
  days,
  onToggle,
  onAll,
}: {
  days: number[]
  onToggle: (index: number) => void
  onAll: () => void
}) {
  const all = days.length === ALL_DAYS.length
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="eyebrow">Hari muncul</span>
        <button
          type="button"
          onClick={onAll}
          className="eyebrow underline underline-offset-2"
          style={{ color: 'var(--ink-2)' }}
        >
          {all ? 'Kosongkan' : 'Setiap hari'}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-pressed={days.includes(i)}
            aria-label={`${label}: ${days.includes(i) ? 'sudah dipilih' : 'belum dipilih'}`}
            onClick={() => onToggle(i)}
            className="flex h-11 items-center justify-center rounded-card border text-[12px] font-bold transition active:scale-[0.96]"
            style={
              days.includes(i)
                ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }
                : { color: 'var(--ink-2)', borderColor: 'var(--hairline)' }
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Bentuk baca dari grid hari: kotak yang sama supaya kartu tidak melompat saat masuk mode edit. */
function DayView({ days }: { days: number[] }) {
  return (
    <div className="mt-3">
      <span className="eyebrow mb-2 block">Hari muncul</span>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={label}
            className="flex h-9 items-center justify-center rounded-card border text-[12px] font-bold"
            style={
              days.includes(i)
                ? { background: 'var(--accent-soft)', color: 'var(--ink)', borderColor: 'var(--accent-soft)' }
                : { color: 'var(--ink-2)', borderColor: 'var(--hairline)' }
            }
          >
            {label}
          </span>
        ))}
      </div>
      {days.length === 0 && (
        <p className="mt-2 text-[12px] text-ink-2">Rencana ini belum muncul di hari apa pun.</p>
      )}
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const remove = () => {
    if (confirming) {
      void removePlan(plan.id)
      return
    }
    setConfirming(true)
    setTimeout(() => setConfirming(false), 4000)
  }

  // Nama subplan baru ditulis saat field kehilangan fokus, jadi ketuk Simpan lebih dulu
  // masih menyimpan ketikan yang belum selesai.
  const save = () => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    announceSaved()
    setEditing(false)
  }

  const all = plan.days.length === ALL_DAYS.length

  if (!editing) {
    return (
      <section className="rounded-card border bg-raised p-4" style={{ borderColor: 'var(--hairline)' }}>
        <div className="flex items-start gap-1">
          <h2 className="min-w-0 flex-1 pt-2 text-[18px] font-bold leading-tight tracking-[-0.025em]">
            {plan.name}
          </h2>
          <IconButton label={`Edit rencana ${plan.name}`} onClick={() => setEditing(true)}>
            <Pencil size={17} strokeWidth={1.75} />
          </IconButton>
        </div>
        <DayView days={plan.days} />
        <div className="mt-3 border-t pt-1" style={{ borderColor: 'var(--hairline)' }}>
          <SubplanList planId={plan.id} />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-card border bg-raised p-4" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex items-center gap-1">
        <input
          value={plan.name}
          aria-label="nama rencana"
          onChange={(e) => void renamePlan(plan.id, e.target.value)}
          className="min-w-0 flex-1 self-start border-b bg-transparent pb-1 pt-2 text-[18px] font-bold leading-tight tracking-[-0.025em] outline-none"
          style={{ borderColor: 'var(--hairline)' }}
        />
        <IconButton label={`Hapus rencana ${plan.name}`} onClick={remove} tone={confirming ? 'danger' : 'quiet'}>
          <Trash2 size={17} strokeWidth={1.75} />
        </IconButton>
      </div>
      <DayPicker
        days={plan.days}
        onToggle={(i) => void setPlanDays(plan.id, toggleDay(plan.days, i))}
        onAll={() => void setPlanDays(plan.id, all ? [] : [...ALL_DAYS])}
      />
      <div className="mt-4 border-t pt-2" style={{ borderColor: 'var(--hairline)' }}>
        <SubplanList planId={plan.id} editing />
      </div>
      <div
        className="mt-3 flex items-center justify-between gap-3 border-t pt-3"
        style={{ borderColor: 'var(--hairline)' }}
      >
        <p className="text-[12px] leading-snug" style={{ color: confirming ? 'var(--danger)' : 'var(--ink-2)' }}>
          {confirming ? 'Ketuk sekali lagi untuk menghapus.' : 'Perubahan tersimpan sendiri.'}
        </p>
        <Button variant="accent" onClick={save}>
          Simpan
        </Button>
      </div>
    </section>
  )
}

function SubplanList({ planId, editing = false }: { planId: string; editing?: boolean }) {
  const items = useLiveQuery(() => itemsForPlan(planId), [planId], [] as Item[])
  const [draft, setDraft] = useState('')

  return (
    <div>
      <h3 className="eyebrow py-2">Subplan · {items.length}</h3>
      {items.length === 0 && (
        <p className="pb-1 text-[13px] text-ink-2">
          {editing
            ? 'Belah rencana ini jadi langkah yang bisa difoto.'
            : 'Belum ada subplan. Ketuk edit untuk menambah.'}
        </p>
      )}
      {editing ? (
        <ul>
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-0.5">
              <input
                defaultValue={item.label}
                aria-label={`nama subplan ${i + 1}`}
                onBlur={(e) => renameSubplan(item.id, e.target.value)}
                className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none"
              />
              <IconButton label={`Naikkan ${item.label}`} onClick={() => moveSubplan(item.id, -1)} disabled={i === 0}>
                <ChevronUp size={16} strokeWidth={1.75} />
              </IconButton>
              <IconButton
                label={`Turunkan ${item.label}`}
                onClick={() => moveSubplan(item.id, 1)}
                disabled={i === items.length - 1}
              >
                <ChevronDown size={16} strokeWidth={1.75} />
              </IconButton>
              <IconButton label={`Hapus subplan ${item.label}`} onClick={() => removeSubplan(item.id)}>
                <X size={16} strokeWidth={1.75} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="py-1.5 text-[15px] leading-snug">
              {item.label}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <form
          className="mt-1 flex items-center gap-1 border-t pt-1"
          style={{ borderColor: 'var(--hairline)' }}
          onSubmit={async (e) => {
            e.preventDefault()
            const added = await addSubplan(planId, draft)
            if (added) setDraft('')
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tambah subplan"
            aria-label="subplan baru"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-2"
          />
          <IconButton
            label="Tambah subplan"
            type="submit"
            tone="accent"
            disabled={draft.trim().length === 0}
          >
            <Plus size={17} strokeWidth={2} />
          </IconButton>
        </form>
      )}
    </div>
  )
}
