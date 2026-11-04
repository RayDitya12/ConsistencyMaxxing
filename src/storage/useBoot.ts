import { useEffect, useState } from 'react'
import { currentBoot, onBoot, type BootState } from './bootstrap'

export function useBoot(): BootState | null {
  const [state, setState] = useState<BootState | null>(() => currentBoot())
  useEffect(() => onBoot(setState), [])
  return state
}
