import { useFavoritesStore, useIsFavorite } from '../../features/favorites/useFavoritesStore.js'
import { formatLabel } from '../../utils/formatExercise.js'

// variant "icon": round heart button (cards). variant "full": heart plus text (details page).
export default function FavoriteButton({ exercise, variant = 'icon', onToggle }) {
  const isFavorite = useIsFavorite(exercise.id)
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite)
  const name = formatLabel(exercise.name)
  const label = isFavorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`

  function handleClick() {
    toggleFavorite(exercise)
    if (onToggle) onToggle(!isFavorite)
  }

  return (
    <button
      type="button"
      className={`fav-btn fav-btn--${variant} ${isFavorite ? 'is-active' : ''}`}
      aria-pressed={isFavorite}
      aria-label={variant === 'icon' ? label : undefined}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 21s-8-4.9-9.6-9.8C1.3 7.8 3.4 5 6.5 5c2 0 3.7 1.1 5.5 3.2C13.8 6.1 15.5 5 17.5 5c3.1 0 5.2 2.8 4.1 6.2C20 16.1 12 21 12 21z"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {variant === 'full' && <span>{isFavorite ? 'Saved to favorites' : 'Save to favorites'}</span>}
    </button>
  )
}
