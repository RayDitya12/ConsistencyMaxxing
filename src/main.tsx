import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { bootstrap } from './storage/bootstrap'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void bootstrap()

registerSW({
  onOfflineReady() {
    document.documentElement.dataset.offline = 'ready'
  },
})
