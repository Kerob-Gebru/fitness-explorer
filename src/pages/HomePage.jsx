import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SearchBar from '../components/exercises/SearchBar.jsx'
import ExerciseGrid from '../components/exercises/ExerciseGrid.jsx'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExercises } from '../services/exerciseApi.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import { pickFeatured } from '../features/exercises/exerciseHelpers.js'
import { countBy, formatLabel } from '../utils/formatExercise.js'
import { useRecentStore } from '../features/recent/useRecentStore.js'
import { useFavoritesStore } from '../features/favorites/useFavoritesStore.js'

export default function HomePage() {
  useDocumentTitle('Home')
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const setSearch = useSearchStore((state) => state.setSearch)
  const setBodyPart = useSearchStore((state) => state.setBodyPart)
  const recentExercises = useRecentStore((state) => state.exercises)
  const favorites = useFavoritesStore((state) => state.favorites)

  const { data: exercises, loading, error, retry } = useAsyncData(() => getExercises(), [])

  function handleSearch() {
    resetFilters()
    setSearch(query.trim())
    navigate('/explore')
  }

  function openCategory(bodyPart) {
    resetFilters()
    setBodyPart(bodyPart)
  }

  const categories = exercises ? Object.entries(countBy(exercises, 'bodyPart')) : []

  return (
    <>
      <section className="hero">
        <h1>Find the right exercise, then learn how to do it well.</h1>
        <p className="hero__text">
          Search by name, narrow by muscle or equipment, and keep the exercises you want to come back to.
        </p>
        <SearchBar value={query} onChange={setQuery} onSubmit={handleSearch} />
        <p className="hero__link">
          or <Link to="/explore">browse the full exercise library</Link>
        </p>
      </section>

      {loading && <Loader label="Loading exercises..." />}
      {error && <ErrorMessage error={error} onRetry={retry} />}

      {exercises && (
        <>
          <section className="section" aria-labelledby="categories-title">
            <h2 id="categories-title">Train by body part</h2>
            <ul className="categories">
              {categories.map(([bodyPart, count]) => (
                <li key={bodyPart}>
                  <Link to="/explore" className="category" onClick={() => openCategory(bodyPart)}>
                    <span className="category__name">{formatLabel(bodyPart)}</span>
                    <span className="category__count">{count} {count === 1 ? 'exercise' : 'exercises'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {recentExercises.length > 0 && (
            <section className="section" aria-labelledby="recent-title">
              <div className="section__head"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="recent-title">Recently viewed</h2></div><Link to="/explore">Explore more</Link></div>
              <ExerciseGrid exercises={recentExercises.slice(0, 3)} />
            </section>
          )}

          {favorites.length > 0 && (
            <section className="section" aria-labelledby="home-favorites-title">
              <div className="section__head"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2 id="home-favorites-title">Saved for later</h2></div><Link to="/favorites">View favorites</Link></div>
              <ExerciseGrid exercises={favorites.slice(0, 3)} />
            </section>
          )}

          <section className="section" aria-labelledby="featured-title">
            <div className="section__head">
              <h2 id="featured-title">Featured exercises</h2>
              <Link to="/explore">See all</Link>
            </div>
            <ExerciseGrid exercises={pickFeatured(exercises, 6)} />
          </section>
        </>
      )}
    </>
  )
}
