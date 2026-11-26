import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Theme tokens must load after index.css so they override the legacy variables.
import './styles/tokens.css'

if (typeof window !== 'undefined') {
  const isMetaMaskExtensionError = (source, message) => {
    const src = String(source || '')
    const msg = String(message || '')
    const fromExtension =
      src.includes('chrome-extension://') || src.includes('moz-extension://')
    return fromExtension && (msg.includes('MetaMask') || src.includes('inpage.js'))
  }

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason
      if (
        isMetaMaskExtensionError(
          reason?.stack || reason?.filename,
          reason?.message || reason,
        )
      ) {
        event.preventDefault()
      }
    },
    true,
  )

  window.addEventListener(
    'error',
    (event) => {
      if (
        isMetaMaskExtensionError(
          event.filename || event.error?.stack,
          event.message || event.error?.message,
        )
      ) {
        event.preventDefault()
      }
    },
    true,
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
