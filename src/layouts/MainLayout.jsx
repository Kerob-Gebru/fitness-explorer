import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'

export default function MainLayout() {
  const { pathname } = useLocation()

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

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Navbar />
      <main id="main" className="container main">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  )
}
