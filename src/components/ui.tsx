import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex h-full w-full max-w-[520px] flex-col">{children}</div>
}

/** Kontras ukuran: eyebrow kecil yang lebar di atas judul berat yang ketat. */
export function TopBar({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 border-b px-4 pb-3 pt-4" style={{ borderColor: 'var(--hairline)' }}>
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow block">{eyebrow}</span>}
        <h1 className="truncate text-[21px] font-bold leading-[1.15]">{title}</h1>
      </div>
      {right && <div className="shrink-0 pb-1">{right}</div>}
    </header>
  )
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="px-4 py-3">
      <h2 className="eyebrow mb-2">{label}</h2>
      <div className="rounded-card border bg-raised p-4" style={{ borderColor: 'var(--hairline)' }}>
        {children}
      </div>
    </section>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'accent' }

export function Button({ variant = 'ghost', className = '', style, ...rest }: ButtonProps) {
  const look =
    variant === 'solid'
      ? { background: 'var(--ink)', color: 'var(--surface)' }
      : variant === 'accent'
        ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
        : { background: 'var(--surface)', color: 'var(--ink)', border: '1.5px solid var(--hairline)' }
  return (
    <button
      {...rest}
      className={`touch-target rounded-card px-4 text-[14px] font-bold tracking-[-0.01em] transition active:translate-y-px active:opacity-80 disabled:opacity-40 ${className}`}
      style={{ ...look, ...style }}
    />
  )
}

export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block">{label}</span>
      <input
        {...rest}
        className="touch-target w-full rounded-card border bg-transparent px-3 py-2 text-[16px] outline-none"
        style={{ borderColor: 'var(--hairline)' }}
      />
    </label>
  )
}

export function Streak({ value, unit, big = false }: { value: number; unit: string; big?: boolean }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col items-start gap-1">
        {big && <span className="block h-[6px] w-8" style={{ background: 'var(--accent)' }} />}
        <span
          className={`num font-bold tracking-[-0.045em] ${big ? 'text-[46px] leading-[0.9]' : 'text-[24px] leading-none'}`}
        >
          {value}
        </span>
      </div>
      <span className="eyebrow pb-1">{unit}</span>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-[14px] leading-relaxed text-ink-2">{children}</p>
}
