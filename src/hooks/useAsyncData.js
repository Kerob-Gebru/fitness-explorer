import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async function and tracks { data, error, loading }.
// It re-runs whenever `deps` change, ignores out-of-date responses,
// and exposes retry() for "Try again" buttons.
export default function useAsyncData(fetcher, deps = []) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const fetcherRef = useRef(fetcher)

  const key = JSON.stringify([...deps, attempt])

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let cancelled = false
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setResult({ key, data: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  // Results for an older key are treated as "still loading".
  const isCurrent = result.key === key
  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: !isCurrent,
    retry,
  }
}
