import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../styles/tokens.css'
import './prototype.css'
import PrototypeApp from './PrototypeApp.jsx'

let savedTheme = 'dark'
try {
  savedTheme = window.localStorage.getItem('fitness-theme') === 'light' ? 'light' : 'dark'
} catch {
  // localStorage can be unavailable; the prototype defaults to dark.
}
document.documentElement.dataset.theme = savedTheme

createRoot(document.getElementById('prototype-root')).render(
  <StrictMode>
    <PrototypeApp />
  </StrictMode>,
)
