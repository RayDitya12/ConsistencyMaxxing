import { setCheck } from '../db/queries'
import type { Check, CheckStatus, Item } from '../db/types'
import { Empty } from './ui'

interface Props {
  date: string
  items: Item[]
  checks: Map<string, Check>
}

const NEXT: Record<string, CheckStatus | null> = { '': 'done', done: 'skip', skip: null }
const READING: Record<string, string> = { done: 'selesai', skip: 'skip', '': 'belum diisi' }

export function ChecklistStrip({ date, items, checks }: Props) {
  if (items.length === 0)
    return <Empty>Plan ini belum punya subplan. Tulis apa saja yang ingin kamu catat per sesi di tab Plan.</Empty>

  async function cycle(item: Item) {
    const current = checks.get(item.id)?.status ?? ''
    await setCheck(date, item.id, NEXT[current])
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const status = checks.get(item.id)?.status ?? ''
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => cycle(item)}
              aria-label={`${item.label}: ${READING[status]}`}
              className="touch-target flex w-full items-center gap-3 rounded-card px-2 py-2 text-left hover:bg-surface-2"
            >
              <Mark status={status} />
              <span className={`flex-1 text-[15px] ${status === 'skip' ? 'text-ink-2 line-through' : ''}`}>{item.label}</span>
              <span className="eyebrow shrink-0">{READING[status]}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function Mark({ status }: { status: string }) {
  // 'full' dan 'done' sama-sama kotak penuh; 'half' cuma beda warna, sesuai arti
  // 'centang tanpa foto' sebagai setengah selesai.
  const filled = status === 'done' || status === 'full'
  if (filled)
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px]"
        style={{ background: 'var(--ink)' }}
      >
        <Tick color="var(--surface)" />
      </span>
    )
  if (status === 'half')
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px]"
        style={{ border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' }}
      >
        <Tick color="var(--accent)" />
      </span>
    )
  if (status === 'skip')
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[13px] leading-none"
        style={{ border: '1.5px solid var(--hairline)', color: 'var(--ink-2)' }}
      >
        &ndash;
      </span>
    )
  return (
    <span
      className="block h-[18px] w-[18px] shrink-0 rounded-[4px]"
      style={{ border: '1.5px solid var(--hairline)' }}
    />
  )
}

function Tick({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]" aria-hidden="true">
      <path d="M1.5 6.4 4.4 9.3 10.5 2.7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
