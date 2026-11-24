import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SearchBar from '../components/exercises/SearchBar.jsx'
import ExerciseFilters from '../components/exercises/ExerciseFilters.jsx'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import {
  getZoneLabel,
  mapExerciseToZones,
  mapMuscleNameToZone,
  resolveZoneBodyPartFilter,
  summarizeExercisesZones,
} from '../features/home3d/studioZoneMapping.js'
import useAsyncData from '../hooks/useAsyncData.js'
import useDebounce from '../hooks/useDebounce.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExercises, getFilterOptions } from '../services/exerciseApi.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import { formatLabel } from '../utils/formatExercise.js'
import { sortExercises } from '../utils/exerciseSearch.js'

const PAGE_SIZE = 12
const noOptions = { bodyParts: [], targets: [], equipment: [] }

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended', searchingLabel: 'Best match' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'body-part', label: 'Body part' },
  { value: 'target', label: 'Target muscle' },
  { value: 'equipment', label: 'Equipment' },
]

// Lives in its own component so "how many are shown" resets whenever the search changes.
function Results({ exercises, hasActiveFilters, onReset, onHoverExercise }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  if (exercises.length === 0) {
    return hasActiveFilters ? (
      <EmptyState title="No exercises found" text="Try a different name, or remove some filters.">
        <button type="button" className="btn btn--primary glint" onClick={onReset}>
          <span className="glint__label">Clear search and filters</span>
        </button>
      </EmptyState>
    ) : (
      <EmptyState
        title="No exercises available"
        text="The exercise library is empty right now. Try again in a moment."
      />
    )
  }

  return (
    <>
      <ExerciseGrid exercises={exercises.slice(0, visible)} onHoverExercise={onHoverExercise} />
      {visible < exercises.length && (
        <div className="center explore-pagination">
          <button
            type="button"
            className="btn btn--primary glint"
            onClick={() => setVisible(visible + PAGE_SIZE)}
          >
            <span className="glint__label">Show more ({exercises.length - visible} remaining)</span>
          </button>
        </div>
      )}
    </>
  )
}

export default function ExplorePage() {
  useDocumentTitle('Explore')
  const { search, bodyPart, target, equipment, setSearch, setBodyPart, setTarget, setEquipment, resetFilters } =
    useSearchStore()
  const debouncedSearch = useDebounce(search, 250)
  const [sortBy, setSortBy] = useState('recommended')
  const [hoveredExercise, setHoveredExercise] = useState(null)
  const isSearching = debouncedSearch.trim().length > 0

  const { data: options } = useAsyncData(() => getFilterOptions(), [])
  const { data: exercises, loading, error, retry } = useAsyncData(
    () => getExercises({ search: debouncedSearch, bodyPart, target, equipment }),
    [debouncedSearch, bodyPart, target, equipment],
  )

  const hasActiveFilters = Boolean(search.trim() || bodyPart || target || equipment)
  const sortedExercises = useMemo(
    () => (exercises ? sortExercises(exercises, { sortBy, query: debouncedSearch }) : null),
    [exercises, sortBy, debouncedSearch],
  )

  const zoneSummary = useMemo(
    () => summarizeExercisesZones(sortedExercises ?? []),
    [sortedExercises],
  )
  const selectedZone = bodyPart ? mapMuscleNameToZone(bodyPart) : null
  const hoveredExerciseZones = useMemo(
    () => (hoveredExercise ? mapExerciseToZones(hoveredExercise) : null),
    [hoveredExercise],
  )
  const hoveredZone = hoveredExerciseZones?.primaryZone ?? null
  const selectedLabel = selectedZone ? getZoneLabel(selectedZone) : ''
  const equipmentCount = useMemo(() => {
    if (!sortedExercises) return options?.equipment?.length ?? 0
    return new Set(sortedExercises.map((ex) => ex.equipment).filter(Boolean)).size
  }, [sortedExercises, options])

  function handleSelectZone(zoneId) {
    if (selectedZone === zoneId) {
      setBodyPart('')
      return
    }
    setBodyPart(resolveZoneBodyPartFilter(zoneId, options?.bodyParts))
  }

  const stageSubtitle = hoveredExercise
    ? `Previewing ${formatLabel(hoveredExercise.name)} — targets ${formatLabel(hoveredExercise.target || hoveredExercise.bodyPart)}.`
    : selectedZone
      ? `Filtering library by ${selectedLabel}. Click ${selectedLabel} again or reset to view all body parts.`
      : 'Click any muscle zone on the 3D athlete to filter the library, or hover an exercise card to spotlight its target.'

  const stageFooter = (
    <div className="studio-stage__footer-row">
      {hoveredExercise ? (
        <div className="studio-stage__tags">
          {hoveredExerciseZones?.primaryZone && (
            <span className="studio-stage__tag studio-stage__tag--primary">
              Primary: {getZoneLabel(hoveredExerciseZones.primaryZone)}
            </span>
          )}
          {hoveredExerciseZones?.secondaryZones.slice(0, 2).map((sec) => (
            <span className="studio-stage__tag studio-stage__tag--secondary" key={sec}>
              Secondary: {getZoneLabel(sec)}
            </span>
          ))}
        </div>
      ) : (
        <p className="studio-stage__footer-note">
          {sortedExercises
            ? `${sortedExercises.length} matched exercise${sortedExercises.length === 1 ? '' : 's'} mapped across ${zoneSummary.activeZones.length} muscle group${zoneSummary.activeZones.length === 1 ? '' : 's'}.`
            : 'Loading exercise anatomy...'}
        </p>
      )}
      {bodyPart && (
        <button type="button" className="studio-stage__action-btn" onClick={() => setBodyPart('')}>
          Clear {formatLabel(bodyPart)}
        </button>
      )}
    </div>
  )

  return (
    <div className="explore-page">
      <header className="page-heading explore-hero">
        <div className="explore-hero__copy">
          <div className="explore-hero__top">
            <p className="eyebrow">EXERCISE LIBRARY</p>
            <span className="explore-hero__sep" aria-hidden="true">/</span>
            <span className="explore-hero__context">
              {selectedZone ? `Focused on ${selectedLabel}` : 'Anatomical Discovery'}
            </span>
          </div>
          <h1 className="display">Explore <em>the library.</em></h1>
          <p className="muted">
            Search by name, muscle, body part, equipment or instructions, or isolate any target zone directly on the 3D athlete.
          </p>
          <div className="explore-hero__actions">
            <Link to="/workout" className="btn btn--primary glint">
              <span className="glint__label">Open workout studio</span>
            </Link>
            {hasActiveFilters && (
              <button type="button" className="btn btn--ghost" onClick={resetFilters}>
                Reset active filters
              </button>
            )}
          </div>
        </div>

        <dl className="explore-hero__metrics" aria-label="Library overview">
          <div className="explore-metric">
            <dt>Matched</dt>
            <dd>{sortedExercises ? sortedExercises.length : '—'}</dd>
          </div>
          <div className="explore-metric">
            <dt>Muscle Zones</dt>
            <dd>{zoneSummary.activeZones.length}<span>/6</span></dd>
          </div>
          <div className="explore-metric">
            <dt>Equipment</dt>
            <dd>{equipmentCount}</dd>
          </div>
        </dl>
      </header>

      <div className="studio-split-layout">
        <div className="studio-split-layout__main">
          <div className="toolbar">
            <SearchBar value={search} onChange={setSearch} />
            <ExerciseFilters
              options={options ?? noOptions}
              values={{ bodyPart, target, equipment }}
              onChange={{ bodyPart: setBodyPart, target: setTarget, equipment: setEquipment }}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          <div className="results-toolbar">
            <div aria-live="polite" className="result-count">
              {exercises &&
                !error &&
                (hasActiveFilters
                  ? `${exercises.length} ${exercises.length === 1 ? 'exercise matches' : 'exercises match'} your search`
                  : `${exercises.length} ${exercises.length === 1 ? 'exercise' : 'exercises'} in the library`)}
            </div>
            <label className="sort-control" htmlFor="exercise-sort">
              Sort by
              <select
                id="exercise-sort"
                className="input"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {isSearching && option.searchingLabel ? option.searchingLabel : option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && <Loader label="Searching exercises..." />}
          {error && <ErrorMessage error={error} onRetry={retry} />}
          {sortedExercises && (
            <Results
              key={`${debouncedSearch.trim()}-${bodyPart}-${target}-${equipment}-${sortBy}`}
              exercises={sortedExercises}
              hasActiveFilters={hasActiveFilters}
              onReset={resetFilters}
              onHoverExercise={setHoveredExercise}
            />
          )}
        </div>

        <div className="studio-split-layout__rail">
          <StudioFigureStage
            eyebrow="3D MUSCLE FILTER"
            title={selectedZone ? <>Filter: <em>{selectedLabel}</em></> : <>Target <em>anatomy</em></>}
            subtitle={stageSubtitle}
            counts={zoneSummary.counts}
            selectedZone={selectedZone}
            hoveredZone={hoveredZone}
            cameraFocusZone={selectedZone}
            onSelectZone={handleSelectZone}
            onClearSelection={() => setBodyPart('')}
            summary={sortedExercises ? `${sortedExercises.length} exercises` : ''}
            footer={stageFooter}
          />
        </div>
      </div>
    </div>
  )
}

