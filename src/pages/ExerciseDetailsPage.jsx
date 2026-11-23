import { Link, useParams } from 'react-router-dom'
import ExerciseLearningCenter from '../components/exercises/ExerciseLearningCenter.jsx'
import FavoriteButton from '../components/exercises/FavoriteButton.jsx'
import WorkoutButton from '../components/exercises/WorkoutButton.jsx'
import RelatedExercises from '../components/exercises/RelatedExercises.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useRecentStore } from '../features/recent/useRecentStore.js'
import { useSearchStore } from '../features/search/useSearchStore.js'
import {
  useExerciseDisplayImage,
  useHasUploadedExerciseImage,
} from '../features/exercises/uploadedExerciseImages.js'
import ExerciseImageUpload from '../components/exercises/ExerciseImageUpload.jsx'
import StudioFigureStage from '../features/home3d/StudioFigureStage.jsx'
import {
  buildSingleExerciseZoneState,
  getZoneLabel,
  resolveZoneBodyPartFilter,
} from '../features/home3d/studioZoneMapping.js'
import Loader from '../components/common/Loader.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { getExerciseById } from '../services/exerciseApi.js'
import { formatLabel } from '../utils/formatExercise.js'

export default function ExerciseDetailsPage() {
  const { id } = useParams()
  const [uploadedImage, setUploadedImage] = useState(null)
  const [hoveredRelated, setHoveredRelated] = useState(null)
  const [inspected, setInspected] = useState(null)
  const { data: exercise, loading, error, retry } = useAsyncData(() => getExerciseById(id), [id])
  const storedImage = useExerciseDisplayImage(exercise)
  const hasUploadedImage = useHasUploadedExerciseImage(exercise)
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const setBodyPart = useSearchStore((state) => state.setBodyPart)
  useDocumentTitle(exercise ? formatLabel(exercise.name) : 'Exercise')
  const rememberExercise = useRecentStore((state) => state.rememberExercise)
  useEffect(() => {
    if (!exercise) return
    const nextUrl = storedImage || exercise.gifUrl
    rememberExercise(nextUrl === exercise.gifUrl ? exercise : { ...exercise, gifUrl: nextUrl })
  }, [exercise, storedImage, rememberExercise])

  const baseZoneState = useMemo(() => buildSingleExerciseZoneState(exercise), [exercise])
  const relatedZoneState = useMemo(
    () => (hoveredRelated ? buildSingleExerciseZoneState(hoveredRelated) : null),
    [hoveredRelated],
  )

  if (loading) return <Loader label="Loading exercise..." />

  if (error?.name === 'NotFoundError') {
    return (
      <NotFoundPage
        title="Exercise not found"
        text="We could not find an exercise with that link. It may have been removed or the address is mistyped."
        linkTo="/explore"
        linkLabel="Browse exercises"
      />
    )
  }
  if (error) return <ErrorMessage error={error} onRetry={retry} />
  if (!exercise) return null

  const currentImage = uploadedImage?.exerciseId === String(exercise.id)
    ? uploadedImage.url
    : (storedImage || exercise.gifUrl)
  const displayExercise = currentImage === exercise.gifUrl ? exercise : { ...exercise, gifUrl: currentImage }

  const inspectedZone = inspected?.exerciseId === String(exercise.id) ? inspected.zoneId : null
  const activeZone = inspectedZone ?? baseZoneState.primaryZone
  const activeCounts = relatedZoneState ? relatedZoneState.counts : baseZoneState.counts
  const previewZone = relatedZoneState?.primaryZone ?? null
  const exploreZone = previewZone ?? activeZone

  const primaryLabel = getZoneLabel(activeZone)
  const secondaryList = baseZoneState.secondaryZones.map((zone) => getZoneLabel(zone)).filter(Boolean)

  return (
    <article className="exercise-details">
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{formatLabel(exercise.name)}</span>
      </nav>

      <header className="details-heading">
        <div>
          <p className="eyebrow">EXERCISE OVERVIEW</p>
          <h1 className="display">{formatLabel(exercise.name)}</h1>
          {exercise.source === 'mock' && <span className="chip chip--accent">Sample exercise</span>}
        </div>
        <div className="details__actions">
          <FavoriteButton exercise={displayExercise} variant="full" />
          <WorkoutButton exercise={displayExercise} />
        </div>
      </header>

      <div className="studio-split-layout">
        <div className="studio-split-layout__main">
          <ExerciseImageUpload
            key={String(exercise.id)}
            exercise={displayExercise}
            exerciseId={exercise.id}
            hasUploadedImage={hasUploadedImage || uploadedImage?.exerciseId === String(exercise.id)}
            onImageUploaded={(url) => setUploadedImage({ exerciseId: String(exercise.id), url })}
          />

          <ExerciseLearningCenter key={`${exercise.id}:${displayExercise.gifUrl || 'default'}`} exercise={displayExercise} />

          <RelatedExercises exercise={displayExercise} onHoverExercise={setHoveredRelated} />
        </div>

        <div className="studio-split-layout__rail">
          <StudioFigureStage
            eyebrow="3D BIOMECHANICAL TARGET"
            title={
              hoveredRelated
                ? <>Preview: <em>{getZoneLabel(relatedZoneState?.primaryZone) || 'Anatomy'}</em></>
                : primaryLabel
                  ? <>Targets <em>{primaryLabel}</em></>
                  : <>Muscle <em>focus</em></>
            }
            subtitle={
              hoveredRelated
                ? `Hovering ${formatLabel(hoveredRelated.name)} (${formatLabel(hoveredRelated.target || hoveredRelated.bodyPart)}).`
                : `Primary muscle: ${formatLabel(exercise.target || exercise.bodyPart)}. Click any zone to explore similar movements.`
            }
            counts={activeCounts}
            selectedZone={activeZone}
            hoveredZone={previewZone}
            cameraFocusZone={activeZone}
            onSelectZone={(zoneId) =>
              setInspected({
                exerciseId: String(exercise.id),
                zoneId: inspectedZone === zoneId ? baseZoneState.primaryZone : zoneId,
              })
            }
            onClearSelection={() => setInspected(null)}
            summary={`${formatLabel(exercise.name)} muscle breakdown`}
            footer={
              <>
                <div className="studio-stage__tags">
                  {baseZoneState.primaryZone && (
                    <span className="studio-stage__tag studio-stage__tag--primary">
                      Primary: {getZoneLabel(baseZoneState.primaryZone)}
                    </span>
                  )}
                  {secondaryList.map((label) => (
                    <span className="studio-stage__tag studio-stage__tag--secondary" key={label}>
                      Secondary: {label}
                    </span>
                  ))}
                </div>
                {exploreZone && (
                  <div className="studio-stage__footer-row">
                    {inspectedZone && inspectedZone !== baseZoneState.primaryZone ? (
                      <button type="button" className="studio-stage__action-btn" onClick={() => setInspected(null)}>
                        Refocus {getZoneLabel(baseZoneState.primaryZone)}
                      </button>
                    ) : (
                      <span className="studio-stage__footer-note">Click any muscle to filter library</span>
                    )}
                    <Link
                      className="studio-stage__footer-link"
                      to="/explore"
                      onClick={() => {
                        resetFilters()
                        setBodyPart(resolveZoneBodyPartFilter(exploreZone))
                      }}
                    >
                      Explore {getZoneLabel(exploreZone)} ↗
                    </Link>
                  </div>
                )}
              </>
            }
          />
        </div>
      </div>
    </article>
  )
}

