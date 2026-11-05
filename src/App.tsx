import { useEffect, useState } from 'react'
import { SavedToast } from './components/SavedToast'
import { CalendarIcon, PlanIcon, ProfileIcon, TodayIcon } from './components/icons'
import { PlanScreen } from './screens/PlanScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { TodayScreen } from './screens/TodayScreen'
import { CalendarScreen } from './screens/CalendarScreen'

type Route = 'today' | 'calendar' | 'plan' | 'profil'

const ROUTES: { key: Route; label: string; Icon: typeof TodayIcon }[] = [
  { key: 'today', label: 'Hari ini', Icon: TodayIcon },
  { key: 'calendar', label: 'Kalender', Icon: CalendarIcon },
  { key: 'plan', label: 'Plan', Icon: PlanIcon },
  { key: 'profil', label: 'Profil', Icon: ProfileIcon },
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
        className="flex gap-1 border-t px-3 pb-1 pt-2 safe-bottom"
        style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}
      >
        {ROUTES.map(({ key, label, Icon }) => {
          const active = route === key
          return (
            <button
              key={key}
              onClick={() => go(key)}
              aria-current={active ? 'page' : undefined}
              className="touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-card py-2 text-[10px] font-semibold tracking-[0.06em] uppercase"
              style={
                active
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                  : { color: 'var(--ink-2)' }
              }
            >
              <Icon size={20} />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
