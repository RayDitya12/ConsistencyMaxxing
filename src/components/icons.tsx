type IconProps = { size?: number }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** Ikon garis: viewBox 24, bobot stroke 1.5, ujung dan sudut bulat. */
export function TodayIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </svg>
  )
}

export function CalendarIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M7.5 14h3M13.5 14h3M7.5 17.5h3" />
    </svg>
  )
}

export function PlanIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base}>
      <path d="M4 6.5h9M4 12h9M4 17.5h6" />
      <path d="M16 16.8l1.9 1.9 4.1-4.2" />
      <circle cx="17.5" cy="6.5" r="2.2" />
    </svg>
  )
}

export function ProfileIcon({ size = 20 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base}>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20.2c1.1-3.4 3.8-5.2 7.2-5.2s6.1 1.8 7.2 5.2" />
    </svg>
  )
}

export function ArrowIcon({ size = 18 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...base}>
      <path d="M6 18 18 6M8 6h10v10" />
    </svg>
  )
}
