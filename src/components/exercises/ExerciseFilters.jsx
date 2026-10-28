import { useId } from 'react'
import { formatLabel } from '../../utils/formatExercise.js'

function FilterSelect({ label, value, options, onChange, anyLabel }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function ExerciseFilters({ options, values, onChange, onReset, hasActiveFilters }) {
  const activeFilters = [
    { key: 'bodyPart', label: 'Body part', value: values.bodyPart },
    { key: 'target', label: 'Muscle', value: values.target },
    { key: 'equipment', label: 'Equipment', value: values.equipment },
  ].filter((filter) => filter.value)

  return (
    <div className="filters-block">
      <div className="filters">
        <FilterSelect
          label="Body part"
          anyLabel="Any body part"
          value={values.bodyPart}
          options={options.bodyParts}
          onChange={onChange.bodyPart}
        />
        <FilterSelect
          label="Target muscle"
          anyLabel="Any muscle"
          value={values.target}
          options={options.targets}
          onChange={onChange.target}
        />
        <FilterSelect
          label="Equipment"
          anyLabel="Any equipment"
          value={values.equipment}
          options={options.equipment}
          onChange={onChange.equipment}
        />
        <button type="button" className="btn" onClick={onReset} disabled={!hasActiveFilters}>
          Clear all
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters">
          <span className="active-filters__label">Active filters</span>
          <ul className="chips">
            {activeFilters.map((filter) => (
              <li key={filter.key}>
                <button
                  type="button"
                  className="chip chip--removable"
                  aria-label={`Remove filter: ${filter.label} ${formatLabel(filter.value)}`}
                  onClick={() => onChange[filter.key]('')}
                >
                  {filter.label}: {formatLabel(filter.value)}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
