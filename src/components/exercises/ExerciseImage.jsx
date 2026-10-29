import { useState } from 'react'

// Shows the exercise demonstration, or a placeholder when it is missing or fails to load.
export default function ExerciseImage({ src, name, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src

  if (showImage) {
    return (
      <img
        className={`exercise-image ${className}`}
        src={src}
        alt={`Demonstration of ${name}`}
        loading="lazy"
        onError={() => setFailedSrc(src)}
      />
    )
  }

  return (
    <div className={`exercise-image exercise-image--empty ${className}`} role="img" aria-label={`No demonstration available for ${name}`}>
      <svg viewBox="0 0 32 32" width="48" height="48" aria-hidden="true">
        <path
          d="M5 12v8M9 9v14M23 9v14M27 12v8M9 16h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span>No demonstration available</span>
    </div>
  )
}
