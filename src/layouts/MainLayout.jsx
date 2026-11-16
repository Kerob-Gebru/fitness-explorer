import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import AppSidebar from '../components/layout/AppSidebar.jsx'
import Footer from '../components/layout/Footer.jsx'

function getPageTitle(pathname) {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/explore')) return 'Explore'
  if (pathname.startsWith('/exercises/')) return 'Exercise details'
  if (pathname.startsWith('/favorites')) return 'Favorites'
  if (pathname.startsWith('/workout/session')) return 'Workout session'
  if (pathname.startsWith('/workout')) return 'Workout'
  if (pathname.startsWith('/calendar')) return 'Calendar'
  if (pathname.startsWith('/progress')) return 'Progress'
  return 'Fitness Explorer'
}

export default function MainLayout() {
  const { pathname } = useLocation()
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

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 761px)')
    const handleViewportChange = (event) => {
      if (event.matches) setIsMenuOpen(false)
    }

    desktopQuery.addEventListener('change', handleViewportChange)
    return () => desktopQuery.removeEventListener('change', handleViewportChange)
  }, [])

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
              <p className="app-header__title">{getPageTitle(pathname)}</p>
              <span className="app-header__brand">Fitness Explorer</span>
            </div>
          </header>
          <main id="main" className="container main">
            <Outlet />
          </main>
          {pathname !== '/workout/session' && <Footer />}
        </div>
      </div>
      <ScrollRestoration />
    </>
  )
}
