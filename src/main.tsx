import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent iOS PWA from restoring a non-zero scroll position on launch
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
