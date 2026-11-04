import { useEffect, useState } from 'react'
import { PlanScreen } from './screens/PlanScreen'
import { DataScreen } from './screens/DataScreen'
import { TodayScreen } from './screens/TodayScreen'

type Route = 'today' | 'plan' | 'data'

const ROUTES: { key: Route; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'plan', label: 'Plan' },
  { key: 'data', label: 'Data' },
]

function readHash(): Route {
  const raw = window.location.hash.replace('#/', '')
  return (ROUTES.find((r) => r.key === raw)?.key ?? 'today') as Route
}

export default function App() {
  const [route, setRoute] = useState<Route>(readHash)

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = `#/${r}`
    setRoute(r)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{route === 'today' ? <TodayScreen /> : route === 'plan' ? <PlanScreen /> : <DataScreen />}</div>
      <nav
        className="flex border-t-2 safe-bottom"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        {ROUTES.map((r) => (
          <button
            key={r.key}
            onClick={() => go(r.key)}
            className="touch-target flex-1 text-[11px] uppercase tracking-[0.14em]"
            style={{
              color: route === r.key ? 'var(--ink)' : 'var(--ink-2)',
              borderBottom: route === r.key ? '3px solid var(--accent)' : '3px solid transparent',
            }}
          >
            {r.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
