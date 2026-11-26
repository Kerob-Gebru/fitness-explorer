import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import AppSidebar from '../components/layout/AppSidebar.jsx'
import Footer from '../components/layout/Footer.jsx'
import { useAuthStore } from '../features/auth/useAuthStore.js'
import { useTheme } from '../features/theme/themeContext.js'

function getPageTitle(pathname, search, isAuthenticated) {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/explore')) return 'Explore'
  if (pathname.startsWith('/exercises/')) return 'Exercise details'
  if (pathname.startsWith('/favorites')) return 'Favorites'
  if (pathname.startsWith('/workout/session')) return 'Workout session'
  if (pathname.startsWith('/workout')) return 'Workout'
  if (pathname.startsWith('/calendar')) return 'Calendar'
  if (pathname.startsWith('/progress')) return 'Progress'
  if (pathname.startsWith('/register')) return isAuthenticated ? 'Account' : 'Create account'
  if (pathname.startsWith('/login')) {
    if (isAuthenticated) return 'Account'
    return new URLSearchParams(search).get('mode') === 'register' ? 'Create account' : 'Sign in'
  }
  return 'Fitness Explorer'
}

function HeaderThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="app-header__theme" role="group" aria-label="Theme switcher">
      <button
        type="button"
        className={theme === 'light' ? 'app-header__theme-option is-active' : 'app-header__theme-option'}
        aria-label="Light mode"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.1" />
          <path d="M12 2.5v2.1M12 19.4v2.1M4.93 4.93l1.5 1.5M17.57 17.57l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.93 19.07l1.5-1.5M17.57 6.43l1.5-1.5" />
        </svg>
        <span className="app-header__theme-label">Light</span>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'app-header__theme-option is-active' : 'app-header__theme-option'}
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.3A7.7 7.7 0 0 1 9.7 4a7.7 7.7 0 1 0 10.3 10.3Z" fill="currentColor" stroke="none" />
        </svg>
        <span className="app-header__theme-label">Dark</span>
      </button>
    </div>
  )
}

export default function MainLayout() {
  const { pathname, search } = useLocation()
  const authUser = useAuthStore((state) => state.user)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const shellRef = useRef(null)
  const menuButtonRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      return undefined
    }

    const elements = document.querySelectorAll([
      '.main .dashboard-home__welcome',
      '.main .dashboard-home__actions',
      '.main .dashboard-home__overview',
      '.main .dashboard-home__weekly',
      '.main .dashboard-home__panel',
      '.main .page-heading',
      '.main .grid > li',
      '.main .calendar-panel',
      '.main .analytics-section',
      '.main .goal-panel',
      '.main .progress-overview',
      '.main .learning-center',
      '.main .interactive-exercise',
      '.main .workout-builder',
      '.main .plans-section',
      '.main .history-section',
      '.main .trend-chart',
      '.main .message',
    ].join(', '))

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' })

    elements.forEach((element, index) => {
      element.classList.add('reveal-on-scroll')
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [pathname])

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMenuOpen])

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setIsMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  useLayoutEffect(() => {
    const sidebar = shellRef.current?.querySelector('.app-sidebar')
    if (!sidebar) return

    sidebar.id = 'app-sidebar'
    sidebar.classList.toggle('is-open', isMenuOpen)
  }, [isMenuOpen])

  const closeMenu = () => {
    setIsMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  const handleShellClick = (event) => {
    if (!isMenuOpen) return
    if (event.target.closest?.('.app-sidebar a')) setIsMenuOpen(false)
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="app-shell" ref={shellRef} onClick={handleShellClick}>
        <AppSidebar />
        {isMenuOpen && (
          <>
            <div className="app-shell__backdrop" aria-hidden="true" onClick={closeMenu} />
            <button
              type="button"
              className="app-shell__drawer-close"
              aria-label="Close navigation"
              onClick={closeMenu}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </>
        )}
        <div className="app-shell__content">
          <header className="app-header">
            <div className="container app-header__inner">
              <button
                ref={menuButtonRef}
                type="button"
                className="app-header__menu"
                aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={isMenuOpen}
                aria-controls="app-sidebar"
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <p className="app-header__title">{getPageTitle(pathname, search, Boolean(authUser))}</p>
              <span className="app-header__brand">Fitness Explorer</span>
              <div className="app-header__auth-actions">
                {authUser ? (
                  <Link
                    to="/login"
                    className="app-header__auth-link is-authenticated"
                  >
                    {authUser.displayName}
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="app-header__auth-link">
                      Sign in
                    </Link>
                    <Link to="/register" className="app-header__auth-link app-header__auth-link--primary">
                      Create account
                    </Link>
                  </>
                )}
              </div>
              <HeaderThemeToggle />
            </div>
          </header>
          <main id="main" className="container main">
            <Outlet />
          </main>
          {pathname !== '/workout/session' && <Footer />}
        </div>
      </div>
      <div className="grain" aria-hidden="true" />
      <ScrollRestoration />
    </>
  )
}
