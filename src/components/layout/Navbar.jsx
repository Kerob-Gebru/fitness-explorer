import { Link, NavLink } from 'react-router-dom'
import { useFavoritesStore } from '../../features/favorites/useFavoritesStore.js'
import { useWorkoutStore } from '../../features/workout/useWorkoutStore.js'

const linkClass = ({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')

export default function Navbar() {
  const favoriteCount = useFavoritesStore((state) => state.favorites.length)
  const workoutCount = useWorkoutStore((state) => state.exercises.length)

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <path
              d="M6 12v8M10 9v14M22 9v14M26 12v8M10 16h12"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span>Fitness Explorer</span>
        </Link>
        <nav aria-label="Main">
          <ul className="nav__links">
            <li>
              <NavLink to="/" end className={linkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/explore" className={linkClass}>
                Explore
              </NavLink>
            </li>
            <li>
              <NavLink to="/workout" className={linkClass}>
                Workout <span className="nav__count" aria-label={`${workoutCount} exercises in workout`}>{workoutCount}</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/favorites" className={linkClass}>
                Favorites
                <span className="nav__count" aria-label={`${favoriteCount} saved`}>
                  {favoriteCount}
                </span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
