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
    return <Empty>Slot ini belum punya daftar. Tulis apa saja yang ingin kamu catat per sesi di tab Plan.</Empty>

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

function Mark({ status }: { status: string }) {
  if (status === 'done')
    return <span className="block h-[18px] w-[18px] shrink-0" style={{ background: 'var(--ink)' }} />
  if (status === 'skip')
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[13px] leading-none"
        style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
      >
        x
      </span>
    )
  return <span className="block h-[18px] w-[18px] shrink-0" style={{ border: '1px solid var(--hairline)' }} />
}
