import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex h-full max-w-[520px] flex-col">{children}</div>
}

export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header
      className="flex items-center justify-between border-b-2 px-4 py-3"
      style={{ borderColor: 'var(--line)' }}
    >
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      {right}
    </header>
  )
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">{label}</h2>
      {children}
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
        : { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' }
  return (
    <button
      {...rest}
      className={`touch-target px-4 text-[14px] font-semibold active:opacity-70 disabled:opacity-40 ${className}`}
      style={{ ...look, ...style }}
    />
  )
}

export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-ink-2">{label}</span>
      <input
        {...rest}
        className="touch-target w-full border-b bg-transparent px-0 py-2 text-[16px] outline-none"
        style={{ borderColor: 'var(--line)' }}
      />
    </label>
  )
}

export function Streak({ value, unit, big = false }: { value: number; unit: string; big?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`num font-semibold ${big ? 'text-[44px] leading-none' : 'text-[22px] leading-none'}`}>
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-2">{unit}</span>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[14px] leading-relaxed text-ink-2">{children}</p>
}
