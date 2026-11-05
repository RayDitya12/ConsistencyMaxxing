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
    <ul className="flex flex-col">
      {items.map((item) => {
        const status = checks.get(item.id)?.status ?? ''
        return (
          <li key={item.id} className="border-b" style={{ borderColor: 'var(--hairline)' }}>
            <button
              type="button"
              onClick={() => cycle(item)}
              aria-label={`${item.label}: ${READING[status]}`}
              className="touch-target flex w-full items-center gap-3 py-2 text-left"
            >
              <Mark status={status} />
              <span className="flex-1 text-[15px]">{item.label}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink-2">{READING[status]}</span>
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
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center" style={{ background: 'var(--ink)' }}>
        <Tick color="var(--surface)" />
      </span>
    )
  if (status === 'half')
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center"
        style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}
      >
        <Tick color="var(--accent)" />
      </span>
    )
  if (status === 'skip')
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[13px] leading-none"
        style={{ border: '1px solid var(--hairline)', color: 'var(--ink-2)' }}
      >
        &ndash;
      </span>
    )
  return <span className="block h-[18px] w-[18px] shrink-0" style={{ border: '1px solid var(--hairline)' }} />
}

function Tick({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]" aria-hidden="true">
      <path d="M1.5 6.4 4.4 9.3 10.5 2.7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
