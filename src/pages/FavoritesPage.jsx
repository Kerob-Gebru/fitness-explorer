import { Link } from 'react-router-dom'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useFavoritesStore } from '../features/favorites/useFavoritesStore.js'

export default function FavoritesPage() {
  useDocumentTitle('Favorites')
  const favorites = useFavoritesStore((state) => state.favorites)

  return (
    <>
      <h1>Your favorites</h1>
      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          text="Tap the heart on any exercise to save it here. Your list stays on this device, even after you refresh."
        >
          <Link to="/explore" className="btn btn--primary">
            Find exercises
          </Link>
        </EmptyState>
      ) : (
        <>
          <p className="result-count">
            {favorites.length} saved {favorites.length === 1 ? 'exercise' : 'exercises'}
          </p>
          <ExerciseGrid exercises={favorites} />
        </>
      )}
    </>
  )
}
