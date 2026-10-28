import { useEffect } from 'react'

// Sets the browser tab title for the current page.
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Fitness Explorer` : 'Fitness & Workout Explorer'
  }, [title])
}
