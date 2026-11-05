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
      <h1 className="text-[13px] font-semibold uppercase tracking-[0.12em]">{title}</h1>
      {right}
    </header>
  )
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-b px-4 py-4" style={{ borderColor: 'var(--hairline)' }}>
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
        <span className="block h-[10px] w-[3px]" style={{ background: 'var(--accent)' }} />
        {label}
      </h2>
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
        : { background: 'transparent', color: 'var(--ink)', border: '2px solid var(--line)' }
  return (
    <button
      {...rest}
      className={`touch-target px-4 text-[13px] font-semibold uppercase tracking-[0.08em] active:opacity-70 disabled:opacity-40 ${className}`}
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
        className="touch-target w-full border-b-2 bg-transparent px-0 py-2 text-[16px] outline-none"
        style={{ borderColor: 'var(--line)' }}
      />
    </label>
  )
}

export function Streak({ value, unit, big = false }: { value: number; unit: string; big?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`num font-semibold ${big ? 'text-[44px] leading-[1.05]' : 'text-[22px] leading-none'}`}
        style={big ? { borderBottom: '4px solid var(--accent)', paddingBottom: 2 } : undefined}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-2">{unit}</span>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-[14px] leading-relaxed text-ink-2">{children}</p>
}
