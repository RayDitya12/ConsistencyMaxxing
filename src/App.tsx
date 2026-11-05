import { useEffect, useState } from 'react'
import { SavedToast } from './components/SavedToast'
import { PlanScreen } from './screens/PlanScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { TodayScreen } from './screens/TodayScreen'
import { CalendarScreen } from './screens/CalendarScreen'

type Route = 'today' | 'calendar' | 'plan' | 'profil'

const ROUTES: { key: Route; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'calendar', label: 'Kalender' },
  { key: 'plan', label: 'Plan' },
  { key: 'profil', label: 'Profil' },
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
      <div className="min-h-0 flex-1">
        {route === 'today' ? (
          <TodayScreen />
        ) : route === 'calendar' ? (
          <CalendarScreen />
        ) : route === 'plan' ? (
          <PlanScreen />
        ) : (
          <ProfileScreen />
        )}
      </div>
      <SavedToast />
      <nav
        className="flex border-t-2 safe-bottom"
        style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
      >
        {ROUTES.map((r) => (
          <button
            key={r.key}
            onClick={() => go(r.key)}
            className="touch-target flex-1 truncate text-[10px] uppercase tracking-[0.08em]"
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
