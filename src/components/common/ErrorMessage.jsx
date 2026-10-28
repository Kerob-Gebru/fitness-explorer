// Shows what went wrong in plain words, with an optional retry button.
const titles = {
  ApiNotVerifiedError: 'Live data is not set up',
  ApiRequestError: 'The exercise service had a problem',
}

export default function ErrorMessage({ error, onRetry }) {
  const title = titles[error?.name] ?? 'Something went wrong'
  return (
    <div className="message message--error" role="alert">
      <h2>{title}</h2>
      <p>{error?.message ?? 'An unknown error happened. Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
