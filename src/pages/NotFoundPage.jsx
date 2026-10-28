import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState.jsx'
import useDocumentTitle from '../hooks/useDocumentTitle.js'

// Used for unknown routes and (with custom text) for exercise ids that do not exist.
export default function NotFoundPage({
  title = 'Page not found',
  text = 'The page you are looking for does not exist.',
  linkTo = '/',
  linkLabel = 'Go to the homepage',
}) {
  useDocumentTitle(title)
  return (
    <EmptyState title={title} text={text}>
      <Link to={linkTo} className="btn btn--primary">
        {linkLabel}
      </Link>
    </EmptyState>
  )
}
