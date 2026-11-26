import { Component, useEffect, useLayoutEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/routes.jsx'
import { ThemeContext } from './features/theme/themeContext.js'
import { hydrateUploadedImagesFromBackend } from './features/exercises/uploadedExerciseImages.js'
import { getUploadedImagesManifest } from './services/backendExerciseApi.js'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <div className="app-error-boundary__card">
            <h1 className="app-error-boundary__title display">Unable to render page</h1>
            <p className="app-error-boundary__message">
              {this.state.error?.message || 'An unexpected application error occurred.'}
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem('fitness-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return 'dark'
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getPreferredTheme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('fitness-theme', theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export default function App() {
  useEffect(() => {
    hydrateUploadedImagesFromBackend(getUploadedImagesManifest)
  }, [])

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </ThemeProvider>
  )
}
