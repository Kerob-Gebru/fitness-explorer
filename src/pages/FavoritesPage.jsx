import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import {
  getZoneLabel,
  mapExerciseToZones,
  summarizeExercisesZones,
} from '../features/home3d/studioZoneMapping.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useFavoritesStore } from '../features/favorites/useFavoritesStore.js'
import { formatLabel } from '../utils/formatExercise.js'

export default function FavoritesPage() {
  useDocumentTitle('Favorites')
  const favorites = useFavoritesStore((state) => state.favorites)
  const [zoneFilter, setZoneFilter] = useState(null)
  const [hoveredExercise, setHoveredExercise] = useState(null)

  const zoneSummary = useMemo(() => summarizeExercisesZones(favorites), [favorites])
  const activeFilter = zoneFilter && zoneSummary.counts[zoneFilter] > 0 ? zoneFilter : null

  const visibleFavorites = useMemo(() => {
    if (!activeFilter) return favorites
    return favorites.filter((exercise) => mapExerciseToZones(exercise).allZones.includes(activeFilter))
  }, [favorites, activeFilter])

  const hoveredZone = useMemo(
    () => (hoveredExercise ? mapExerciseToZones(hoveredExercise).primaryZone : null),
    [hoveredExercise],
  )

  return (
    <section className="favorites-page" aria-labelledby="favorites-title">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PERSONAL COLLECTION</p>
          <h1 id="favorites-title" className="display">Saved <em>favorites</em></h1>
          <p className="muted">
            {favorites.length === 0
              ? 'Keep your go-to movements in one place for fast routine building.'
              : `${favorites.length} saved ${favorites.length === 1 ? 'exercise' : 'exercises'} ready for your next workout. Click any muscle on the 3D athlete to filter.`}
          </p>
        </div>
        {favorites.length > 0 && (
          <Link to="/explore" className="btn">
            Explore more
          </Link>
        )}
      </header>
      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          text="Tap the heart on any exercise to save it here. Your list stays on this device, even after you refresh."
        >
          <Link to="/explore" className="btn btn--primary glint">
            <span className="glint__label">Find exercises</span>
          </Link>
        </EmptyState>
      ) : (
        <div className="studio-split-layout">
          <div className="studio-split-layout__main">
            {activeFilter && (
              <div className="results-toolbar">
                <p className="result-count">
                  Showing {visibleFavorites.length} of {favorites.length} saved for <strong>{getZoneLabel(activeFilter)}</strong>
                </p>
                <button type="button" className="btn" onClick={() => setZoneFilter(null)}>
                  Show all favorites
                </button>
              </div>
            )}
            <ExerciseGrid exercises={visibleFavorites} onHoverExercise={setHoveredExercise} />
          </div>

          <div className="studio-split-layout__rail">
            <StudioFigureStage
              eyebrow="SAVED COLLECTION MAP"
              title={
                activeFilter
                  ? <>Filtered: <em>{getZoneLabel(activeFilter)}</em></>
                  : <>Favorite <em>split</em></>
              }
              subtitle={
                hoveredExercise
                  ? `Highlighting ${formatLabel(hoveredExercise.name)} (${formatLabel(hoveredExercise.target || hoveredExercise.bodyPart)}).`
                  : activeFilter
                    ? `Showing ${visibleFavorites.length} saved exercise${visibleFavorites.length === 1 ? '' : 's'} for ${getZoneLabel(activeFilter)}.`
                    : 'Your saved exercises mapped across body zones. Click a zone to filter your collection.'
              }
              counts={zoneSummary.counts}
              selectedZone={activeFilter}
              hoveredZone={hoveredZone}
              cameraFocusZone={activeFilter}
              onSelectZone={(zoneId) => setZoneFilter((current) => (current === zoneId ? null : zoneId))}
              onClearSelection={() => setZoneFilter(null)}
              summary={`${favorites.length} saved exercises`}
              footer={
                <div className="studio-stage__footer-row">
                  <span className="studio-stage__footer-note">
                    {activeFilter
                      ? `${visibleFavorites.length} of ${favorites.length} saved`
                      : zoneSummary.dominantZone
                        ? `Most saved: ${getZoneLabel(zoneSummary.dominantZone)}`
                        : 'Select a zone to filter'}
                  </span>
                  {activeFilter && (
                    <button type="button" className="studio-stage__action-btn" onClick={() => setZoneFilter(null)}>
                      Show all
                    </button>
                  )}
                </div>
              }
            />
          </div>
        </div>
      )}
    </section>
  )
}

