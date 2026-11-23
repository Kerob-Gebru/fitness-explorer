import { FOCUS_ZONES } from './focusFigureData.js'

export default function FocusFigureLegend({
  counts,
  selectedZone,
  hoveredZone,
  onSelectZone,
  onHoverZone,
}) {
  return (
    <ul className="focus-figure__legend" aria-label="Muscle groups this week">
      {FOCUS_ZONES.map((zone) => {
        const count = counts[zone.id] ?? 0
        const selected = selectedZone === zone.id
        const hovered = hoveredZone === zone.id
        return (
          <li key={zone.id}>
            <button
              type="button"
              className={`focus-figure__zone-btn${hovered ? ' is-hovered' : ''}${count > 0 ? ' has-activity' : ''}`}
              data-zone={zone.id}
              aria-pressed={selected}
              aria-label={`${zone.label}, ${count} completed ${count === 1 ? 'exercise' : 'exercises'} this week`}
              onClick={() => onSelectZone(zone.id)}
              onMouseEnter={() => onHoverZone(zone.id)}
              onMouseLeave={() => onHoverZone(null)}
              onFocus={() => onHoverZone(zone.id)}
              onBlur={() => onHoverZone(null)}
            >
              <span className="focus-figure__legend-swatch" aria-hidden="true" />
              <span className="focus-figure__legend-name">{zone.label}</span>
              <span className="focus-figure__legend-count" aria-hidden="true">{count}</span>
              <span className="focus-figure__legend-check" aria-hidden="true">{selected ? '✓' : ''}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
