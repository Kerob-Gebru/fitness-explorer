import { useId } from 'react'

// Controlled search box. Pass onSubmit if pressing Enter / the button should do something.
export default function SearchBar({ value, onChange, onSubmit, label = 'Search exercises', placeholder = 'Try "squat", "triceps" or "cable"' }) {
  const id = useId()

  function handleSubmit(event) {
    event.preventDefault()
    if (onSubmit) onSubmit()
  }

  return (
    <form className="search" role="search" onSubmit={handleSubmit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <div className="search__field">
        <input
          id={id}
          type="search"
          className="input"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {value.length > 0 && (
          <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="Clear search">
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {onSubmit && (
        <button type="submit" className="btn btn--primary">
          Search
        </button>
      )}
    </form>
  )
}
