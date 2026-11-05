import { useEffect, useState } from 'react'
import { onSaved } from '../lib/saved'

const DISMISS_MS = 2400

export function SavedToast() {
  const [message, setMessage] = useState('')

  useEffect(
    () =>
      onSaved((next) => {
        setMessage(next)
      }),
    [],
  )

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [message])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
    >
      {message && (
        <div
          className="flex items-center gap-2 rounded-card px-4 py-2 text-[13px] font-bold"
          style={{ background: 'var(--ink)', color: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">
            <path
              d="M2 7.4 5.2 10.6 12 3.4"
              fill="none"
              stroke="var(--acid)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {message}
        </div>
      )}
    </div>
  )
}
