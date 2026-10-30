import { useEffect, useId, useState } from 'react'
import { normalizeExerciseInstructions, normalizeExerciseMedia, normalizeExerciseValues } from '../../features/exercises/exerciseDetails.js'
import { formatLabel } from '../../utils/formatExercise.js'

export default function ExerciseLearningCenter({ exercise, compact = false }) {
  const [failedMedia, setFailedMedia] = useState([])
  const [loadedMedia, setLoadedMedia] = useState([])
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const [motionEnabledUrl, setMotionEnabledUrl] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const id = useId()
  const name = formatLabel(exercise?.name, 'Exercise')
  const media = normalizeExerciseMedia(exercise).filter((item) => !failedMedia.includes(item.url))
  const activeMedia = media.find((item) => item.url === selectedMediaUrl) ?? media[0]
  const isMediaLoaded = activeMedia ? loadedMedia.includes(activeMedia.url) : false
  const animationRequiresOptIn = activeMedia?.type === 'gif' && prefersReducedMotion && motionEnabledUrl !== activeMedia.url
  const instructions = normalizeExerciseInstructions(exercise?.instructions)
  const currentInstruction = instructions[currentStep]
  const primaryMuscles = normalizeExerciseValues(exercise?.target)
  const primaryKeys = new Set(primaryMuscles.map((muscle) => muscle.toLocaleLowerCase()))
  const secondaryMuscles = normalizeExerciseValues(exercise?.secondaryMuscles)
    .filter((muscle) => !primaryKeys.has(muscle.toLocaleLowerCase()))
  const bodyParts = normalizeExerciseValues(exercise?.bodyPart)
  const equipment = normalizeExerciseValues(exercise?.equipment)
  const category = normalizeExerciseValues(exercise?.category)
  const difficulty = normalizeExerciseValues(exercise?.difficulty)
  const tips = normalizeExerciseInstructions(exercise?.tips)
  const safety = normalizeExerciseInstructions(exercise?.safetyConsiderations)
  const mistakes = normalizeExerciseInstructions(exercise?.commonMistakes)
  const hasGuidance = tips.length > 0 || safety.length > 0 || mistakes.length > 0
  const hasMuscleInfo = primaryMuscles.length > 0 || secondaryMuscles.length > 0 ||
    bodyParts.length > 0 || equipment.length > 0 || category.length > 0 || difficulty.length > 0

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mediaQuery?.addEventListener) return undefined
    const updatePreference = (event) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  function markMediaFailed(url) {
    setFailedMedia((current) => current.includes(url) ? current : [...current, url])
    setLoadedMedia((current) => current.filter((loadedUrl) => loadedUrl !== url))
  }

  function markMediaLoaded(url) {
    setLoadedMedia((current) => current.includes(url) ? current : [...current, url])
  }

  return (
    <section className={`learning-center${compact ? ' learning-center--compact' : ''}`} aria-labelledby={`${id}-title`}>
      <header className="learning-center__heading">
        <div>
          <p className="eyebrow">{compact ? 'MOVEMENT GUIDE' : 'EXERCISE DEMONSTRATION AND LEARNING CENTER'}</p>
          <h2 id={`${id}-title`}>{compact ? 'Movement guide' : 'Learn the movement'}</h2>
        </div>
      </header>

      {activeMedia || instructions.length > 0 ? (
        <div className={`learning-center__content${instructions.length ? ' learning-center__content--split' : ''}`}>
          <div className="learning-center__media">
            {activeMedia ? (
              <figure className="learning-center__figure">
                <div className={`learning-center__visual-frame learning-center__visual-frame--${activeMedia.type}${isMediaLoaded ? ' is-loaded' : ''}`}>
                  {activeMedia.type === 'video' ? (
                    <video
                      key={activeMedia.url}
                      className="learning-center__visual"
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={`${name} exercise demonstration`}
                      onLoadedMetadata={() => markMediaLoaded(activeMedia.url)}
                      onError={() => markMediaFailed(activeMedia.url)}
                    >
                      <source src={activeMedia.url} />
                      Your browser cannot play this exercise video.
                    </video>
                  ) : animationRequiresOptIn ? (
                    <div className="learning-center__motion-prompt">
                      <p>This animation is paused for your reduced-motion setting.</p>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => setMotionEnabledUrl(activeMedia.url)}
                      >
                        Play animation
                      </button>
                    </div>
                  ) : (
                    <img
                      key={activeMedia.url}
                      className="learning-center__visual"
                      src={activeMedia.url}
                      alt={`${name} ${activeMedia.type === 'gif' ? 'animated' : ''} exercise demonstration`}
                      loading="lazy"
                      onLoad={() => markMediaLoaded(activeMedia.url)}
                      onError={() => markMediaFailed(activeMedia.url)}
                    />
                  )}
                  {!isMediaLoaded && !animationRequiresOptIn && <span className="learning-center__loading" role="status">{activeMedia.type === 'video' ? 'Loading video…' : 'Loading demonstration…'}</span>}
                </div>
                <figcaption>
                  {activeMedia.type === 'video' ? 'Video demonstration · use the playback controls' : activeMedia.type === 'gif' ? 'Animated exercise demonstration' : 'Exercise reference image'}
                  {activeMedia.attribution && (
                    <span className="learning-center__attribution">
                      {' '}“{activeMedia.attribution.title}” by {activeMedia.attribution.creator},{' '}
                      <a href={activeMedia.attribution.sourceUrl} target="_blank" rel="noreferrer">{activeMedia.attribution.source}</a>,
                      {' '}{activeMedia.attribution.licenseUrl
                        ? <a href={activeMedia.attribution.licenseUrl} target="_blank" rel="noreferrer">{activeMedia.attribution.license}</a>
                        : activeMedia.attribution.license}. {activeMedia.attribution.changes}
                    </span>
                  )}
                </figcaption>
                {media.length > 1 && (
                  <div className="learning-center__media-picker" role="group" aria-label="Choose exercise demonstration">
                    {media.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        className={`btn${activeMedia.url === item.url ? ' btn--primary' : ''}`}
                        aria-pressed={activeMedia.url === item.url}
                        onClick={() => setSelectedMediaUrl(item.url)}
                      >
                        {item.type === 'gif' ? (item.source === 'verified-local' ? 'Verified GIF' : 'GIF') : item.type === 'video' ? 'Video' : 'Image'}
                      </button>
                    ))}
                  </div>
                )}
              </figure>
            ) : (
              <div className="learning-center__media-fallback">
                <svg viewBox="0 0 32 32" width="38" height="38" aria-hidden="true">
                  <path d="M5 12v8M9 9v14M23 9v14M27 12v8M9 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                <p>{failedMedia.length
                  ? 'Demonstration media could not be loaded.'
                  : 'Visual demonstration media is currently unavailable.'}</p>
                {instructions.length > 0 && <span>Use the step-by-step guide to follow the recorded instructions.</span>}
              </div>
            )}
          </div>

          {instructions.length > 0 ? (
            <section className="learning-center__guide" aria-labelledby={`${id}-steps-title`}>
              <div className="learning-center__guide-heading">
                <h3 id={`${id}-steps-title`}>Step-by-step guide</h3>
                <span className="learning-center__step-count" aria-live="polite">Step {currentStep + 1} of {instructions.length}</span>
              </div>
              <div className="learning-center__viewer" aria-live="polite" aria-atomic="true">
                <span className="learning-center__viewer-index">STEP {String(currentStep + 1).padStart(2, '0')}</span>
                <p>{currentInstruction}</p>
              </div>
              <div className="learning-center__viewer-controls">
                <button
                  type="button"
                  className="btn"
                  disabled={currentStep === 0}
                  aria-label="Previous instruction"
                  onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                >
                  Previous step
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={currentStep === instructions.length - 1}
                  aria-label="Next instruction"
                  onClick={() => setCurrentStep((step) => Math.min(instructions.length - 1, step + 1))}
                >
                  Next step
                </button>
              </div>
              <ol className="learning-center__steps" aria-label="All exercise instructions">
                {instructions.map((instruction, index) => (
                  <li
                    className={index === currentStep ? 'is-current' : ''}
                    aria-current={index === currentStep ? 'step' : undefined}
                    key={`${index}-${instruction}`}
                  >
                    <span aria-hidden="true">{index + 1}</span>
                    <p>{instruction}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <p className="muted learning-center__missing-instructions">Detailed instructions are not available for this exercise.</p>
          )}
        </div>
      ) : (
        <div className="learning-center__empty">
          <div className="learning-center__media-fallback learning-center__media-fallback--compact">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
              <path d="M5 12v8M9 9v14M23 9v14M27 12v8M9 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
            <p>{failedMedia.length ? 'Demonstration media could not be loaded.' : 'Visual demonstration media is currently unavailable.'}</p>
          </div>
          <p>Detailed instructions are not available for {name}.</p>
        </div>
      )}

      {hasMuscleInfo && (
        <section className="learning-center__metadata" aria-labelledby={`${id}-muscles-title`}>
          <h3 id={`${id}-muscles-title`}>Muscles and equipment</h3>
          {primaryMuscles.length > 0 && <InfoGroup title="Primary target" values={primaryMuscles} accent />}
          {secondaryMuscles.length > 0 && <InfoGroup title="Secondary muscles" values={secondaryMuscles} />}
          <dl className="learning-center__facts">
            {bodyParts.length > 0 && <div><dt>Body part</dt><dd>{bodyParts.map(formatLabel).join(', ')}</dd></div>}
            {equipment.length > 0 && <div><dt>Equipment</dt><dd>{equipment.map(formatLabel).join(', ')}</dd></div>}
            {category.length > 0 && <div><dt>Category</dt><dd>{category.map(formatLabel).join(', ')}</dd></div>}
            {difficulty.length > 0 && <div><dt>Difficulty</dt><dd>{difficulty.map(formatLabel).join(', ')}</dd></div>}
          </dl>
        </section>
      )}

      {hasGuidance && (
        <section className="learning-center__technique" aria-labelledby={`${id}-technique-title`}>
          <h3 id={`${id}-technique-title`}>Technique information</h3>
          {tips.length > 0 && <GuidanceList title="Tips" items={tips} />}
          {safety.length > 0 && <GuidanceList title="Safety considerations" items={safety} />}
          {mistakes.length > 0 && <GuidanceList title="Common mistakes" items={mistakes} />}
        </section>
      )}
    </section>
  )
}

function InfoGroup({ title, values, accent = false }) {
  return (
    <div className="learning-center__info-group">
      <h4>{title}</h4>
      <ul className="chips">
        {values.map((value) => <li className={`chip${accent ? ' chip--accent' : ''}`} key={value}>{formatLabel(value)}</li>)}
      </ul>
    </div>
  )
}

function GuidanceList({ title, items }) {
  return (
    <div className="learning-center__guidance-group">
      <h4>{title}</h4>
      <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
    </div>
  )
}
