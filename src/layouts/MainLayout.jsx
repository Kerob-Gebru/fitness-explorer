import { Outlet, ScrollRestoration } from 'react-router-dom'
import Navbar from '../components/layout/Navbar.jsx'
import Footer from '../components/layout/Footer.jsx'

export default function MainLayout() {
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
