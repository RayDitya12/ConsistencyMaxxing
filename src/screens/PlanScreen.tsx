import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Empty, Field, Screen, Section, TopBar } from '../components/ui'
import {
  addSubplan,
  createPlan,
  formatDays,
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
import { WEEKDAY_LABELS } from '../config'
import type { Item, Plan } from '../db/types'

export function PlanScreen() {
  const plans = useLiveQuery(() => allPlans(), [], [])
  const [adding, setAdding] = useState(false)

  return (
    <Screen>
      <TopBar title="Plan" right={<span className="num text-[12px] text-ink-2">{plans.length}</span>} />
      <div className="flex-1 overflow-y-auto">
        {adding ? (
          <NewPlan onDone={() => setAdding(false)} />
        ) : (
          <Section label="Rencanamu">
            <Button variant="accent" className="w-full" onClick={() => setAdding(true)}>
              + Tambah rencana
            </Button>
            {plans.length === 0 && (
              <>
                <Empty>
                  Belum ada rencana. Satu rencana itu namanya plus hari-hari ia muncul — semuanya tulisanmu
                  sendiri, tidak ada yang dibuat otomatis.
                </Empty>
                <Button className="w-full" onClick={() => void seedWorkoutExample()}>
                  Isi contoh: Workout (Senin Upper, Selasa Lower, dst)
                </Button>
              </>
            )}
          </Section>
        )}
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </Screen>
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
    <Section label="Rencana baru">
      <div className="space-y-4">
        <Field
          label="Nama rencana"
          value={name}
          placeholder="mis. Belajar NLP"
          autoFocus
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
        />
        <DayPicker
          days={days}
          onToggle={(i) => setDays((current) => toggleDay(current, i))}
        />
        <p className="text-[12px] leading-relaxed text-ink-2">{formatDays(days)}</p>
        {error && (
          <p className="text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="accent" className="flex-1" onClick={() => void save()}>
            Simpan
          </Button>
          <Button onClick={onDone}>Batal</Button>
        </div>
      </div>
    </Section>
  )
}

function DayPicker({ days, onToggle }: { days: number[]; onToggle: (index: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {WEEKDAY_LABELS.map((label, i) => (
        <button
          key={label}
          type="button"
          aria-pressed={days.includes(i)}
          aria-label={`${label}: ${days.includes(i) ? 'sudah dipilih' : 'belum dipilih'}`}
          onClick={() => onToggle(i)}
          className="touch-target min-w-[44px] flex-1 border text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={
            days.includes(i)
              ? { background: 'var(--ink)', color: 'var(--surface)', borderColor: 'var(--ink)' }
              : { background: 'transparent', color: 'var(--ink-2)', borderColor: 'var(--hairline)' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const [confirming, setConfirming] = useState(false)

  const remove = () => {
    if (confirming) {
      void removePlan(plan.id)
      return
    }
    setConfirming(true)
    setTimeout(() => setConfirming(false), 4000)
  }

  return (
    <section className="border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
      <input
        value={plan.name}
        aria-label="nama rencana"
        onChange={(e) => void renamePlan(plan.id, e.target.value)}
        className="touch-target mb-3 w-full border-b bg-transparent py-1 text-[16px] font-semibold outline-none"
        style={{ borderColor: 'var(--line)' }}
      />
      <DayPicker days={plan.days} onToggle={(i) => void setPlanDays(plan.id, toggleDay(plan.days, i))} />
      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{formatDays(plan.days)}</p>
      <div className="mt-4">
        <SubplanList planId={plan.id} />
      </div>
      <Button
        className="mt-4 w-full"
        onClick={remove}
        style={confirming ? { background: 'var(--danger)', color: 'var(--surface)', borderColor: 'var(--danger)' } : undefined}
      >
        {confirming ? 'Ketuk lagi untuk menghapus' : 'Hapus rencana ini'}
      </Button>
    </section>
  )
}

function SubplanList({ planId }: { planId: string }) {
  const items = useLiveQuery(() => itemsForPlan(planId), [planId], [] as Item[])
  const [draft, setDraft] = useState('')

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">Subplan</h3>
      <ul>
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-1 border-b py-1" style={{ borderColor: 'var(--hairline)' }}>
            <input
              defaultValue={item.label}
              onBlur={(e) => renameSubplan(item.id, e.target.value)}
              className="touch-target min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
            <button className="touch-target px-1 text-[12px] text-ink-2" onClick={() => moveSubplan(item.id, -1)} disabled={i === 0} aria-label="Naik">
              ↑
            </button>
            <button
              className="touch-target px-1 text-[12px] text-ink-2"
              onClick={() => moveSubplan(item.id, 1)}
              disabled={i === items.length - 1}
              aria-label="Turun"
            >
              ↓
            </button>
            <button className="touch-target px-1 text-[12px]" onClick={() => removeSubplan(item.id)} aria-label={`hapus subplan ${item.label}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="tambah subplan, mis. Bab 3 selesai"
          className="touch-target min-w-0 flex-1 border-b bg-transparent py-1 text-[16px] outline-none"
          style={{ borderColor: 'var(--hairline)' }}
        />
        <Button
          onClick={async () => {
            await addSubplan(planId, draft)
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
