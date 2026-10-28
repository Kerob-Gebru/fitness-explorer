import { useMemo, useState } from 'react'
import SearchBar from '../components/exercises/SearchBar.jsx'
import ExerciseFilters from '../components/exercises/ExerciseFilters.jsx'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDebounce from '../hooks/useDebounce.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExercises, getFilterOptions } from '../services/exerciseApi.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
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
function Results({ exercises, hasActiveFilters, onReset }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  if (exercises.length === 0) {
    return hasActiveFilters ? (
      <EmptyState title="No exercises found" text="Try a different name, or remove some filters.">
        <button type="button" className="btn btn--primary" onClick={onReset}>
          Clear search and filters
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
      <ExerciseGrid exercises={exercises.slice(0, visible)} />
      {visible < exercises.length && (
        <div className="center">
          <button type="button" className="btn" onClick={() => setVisible(visible + PAGE_SIZE)}>
            Show more ({exercises.length - visible} left)
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

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXERCISE LIBRARY</p>
          <h1>Explore exercises</h1>
          <p className="muted">
            Search by name, muscle, body part, equipment or instructions, then narrow the list with filters.
          </p>
        </div>
      </div>

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
        />
      )}
    </>
  )
}
