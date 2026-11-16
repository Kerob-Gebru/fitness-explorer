import { Link, NavLink } from 'react-router-dom'
import { useFavoritesStore } from '../../features/favorites/useFavoritesStore.js'
import { useTheme } from '../../features/theme/themeContext.js'
import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'

const linkClass = ({ isActive }) => (
  isActive ? 'app-sidebar-link app-sidebar-link--active' : 'app-sidebar-link'
)

function SidebarIcon({ name }) {
  const paths = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    explore: 'M10.8 3.8a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM16 16l5 5M8 11h5M10.5 8.5v5',
    workout: 'M4 10v4M7 7v10M17 7v10M20 10v4M7 12h10',
    calendar: 'M5 4v4M19 4v4M4 7h16v13H4zM8 11h3M8 15h3M14 11h3',
    progress: 'M4 19V5M4 19h17M7 15l4-4 3 2 6-7',
    favorites: 'M12 20s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.2-8 11-8 11Z',
  }

  return (
    <svg className="app-sidebar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="app-sidebar-theme" role="group" aria-label="Theme switcher">
      <button
        type="button"
        className={theme === 'light' ? 'app-sidebar-theme-option is-active' : 'app-sidebar-theme-option'}
        aria-label="Light mode"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.1" />
          <path d="M12 2.5v2.1M12 19.4v2.1M4.93 4.93l1.5 1.5M17.57 17.57l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.93 19.07l1.5-1.5M17.57 6.43l1.5-1.5" />
        </svg>
        <span className="app-sidebar-theme-label">Light</span>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'app-sidebar-theme-option is-active' : 'app-sidebar-theme-option'}
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.3A7.7 7.7 0 0 1 9.7 4a7.7 7.7 0 1 0 10.3 10.3Z" fill="currentColor" stroke="none" />
        </svg>
        <span className="app-sidebar-theme-label">Dark</span>
      </button>
    </div>
  )
}

export default function AppSidebar() {
  const favoriteCount = useFavoritesStore((state) => state.favorites.length)
  const workoutCount = useWorkoutStore((state) => state.exercises.length)

  return (
    <aside className="app-sidebar" aria-label="Fitness Explorer sidebar">
      <Link to="/" className="app-sidebar-brand">
        <span className="app-sidebar-brand-mark" aria-hidden="true">
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
        <span className="app-sidebar-brand-text">Fitness Explorer</span>
      </Link>

      <nav className="app-sidebar-nav" aria-label="Main">
        <ul className="app-sidebar-links">
          <li>
            <NavLink to="/" end className={linkClass}>
              <SidebarIcon name="home" /> <span className="app-sidebar-label">Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/explore" className={linkClass}>
              <SidebarIcon name="explore" /> <span className="app-sidebar-label">Explore</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/workout" className={linkClass}>
              <SidebarIcon name="workout" /> <span className="app-sidebar-label">Workout</span>
              <span className="app-sidebar-count" aria-label={`${workoutCount} exercises in workout`}>
                {workoutCount}
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/calendar" className={linkClass}>
              <SidebarIcon name="calendar" /> <span className="app-sidebar-label">Calendar</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/progress" className={linkClass}>
              <SidebarIcon name="progress" /> <span className="app-sidebar-label">Progress</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/favorites" className={linkClass}>
              <SidebarIcon name="favorites" /> <span className="app-sidebar-label">Favorites</span>
              <span className="app-sidebar-count" aria-label={`${favoriteCount} saved`}>
                {favoriteCount}
              </span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="app-sidebar-footer">
        <SidebarThemeToggle />
      </div>
    </aside>
  )
}
