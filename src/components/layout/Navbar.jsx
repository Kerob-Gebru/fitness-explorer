import { Link, NavLink } from 'react-router-dom'
import { useFavoritesStore } from '../../features/favorites/useFavoritesStore.js'
import { useTheme } from '../../features/theme/themeContext.js'
import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'

const linkClass = ({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')

function NavIcon({ name }) {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    explore: 'M10.8 3.8a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l5 5M8 11h5M10.5 8.5v5',
    workout: 'M4 10v4M7 7v10M17 7v10M20 10v4M7 12h10',
    calendar: 'M5 4v4M19 4v4M4 7h16v13H4zM8 11h3M8 15h3M14 11h3',
    progress: 'M4 19V5M4 19h17M7 15l4-4 3 2 6-7',
    favorites: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11Z',
  }

  return (
    <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="nav__theme-switcher" role="group" aria-label="Theme switcher">
      <button
        type="button"
        className={theme === 'light' ? 'nav__theme-option is-active' : 'nav__theme-option'}
        aria-label="Light mode"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.1" />
          <path d="M12 2.5v2.1M12 19.4v2.1M4.93 4.93l1.5 1.5M17.57 17.57l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.93 19.07l1.5-1.5M17.57 6.43l1.5-1.5" />
        </svg>
        <span>Light</span>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'nav__theme-option is-active' : 'nav__theme-option'}
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.3A7.7 7.7 0 0 1 9.7 4a7.7 7.7 0 1 0 10.3 10.3Z" fill="currentColor" stroke="none" />
        </svg>
        <span>Dark</span>
      </button>
    </div>
  )
}

export default function Navbar() {
  const favoriteCount = useFavoritesStore((state) => state.favorites.length)
  const workoutCount = useWorkoutStore((state) => state.exercises.length)

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand">
          <span className="nav__brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="25" height="25">
              <path
                d="M6 12v8M10 9v14M22 9v14M26 12v8M10 16h12"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <span>Fitness Explorer</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav__links">
            <li>
              <NavLink to="/" end className={linkClass}>
                <NavIcon name="home" /> <span>Home</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/explore" className={linkClass}>
                <NavIcon name="explore" /> <span>Explore</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/workout" className={linkClass}>
                <NavIcon name="workout" /> <span>Workout</span> <span className="nav__count" aria-label={`${workoutCount} exercises in workout`}>{workoutCount}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/calendar" className={linkClass}>
                <NavIcon name="calendar" /> <span>Calendar</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/progress" className={linkClass}>
                <NavIcon name="progress" /> <span>Progress</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/favorites" className={linkClass}>
                <NavIcon name="favorites" /> <span>Favorites</span>
                <span className="nav__count" aria-label={`${favoriteCount} saved`}>
                  {favoriteCount}
                </span>
              </NavLink>
            </li>
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
