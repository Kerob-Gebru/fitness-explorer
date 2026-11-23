import { useId } from 'react'
import { FOCUS_ZONES } from './focusFigureData.js'

function zoneClass(id, hoveredZone, selectedZone, counts) {
  return [
    'focus-figure__zone-shape',
    Number(counts?.[id]) > 0 ? 'is-active' : '',
    hoveredZone === id ? 'is-hovered' : '',
    selectedZone === id ? 'is-selected' : '',
  ].filter(Boolean).join(' ')
}

function ZoneGroup({ id, counts, hoveredZone, selectedZone, onSelectZone, onHoverZone, children }) {
  return (
    <g
      className={zoneClass(id, hoveredZone, selectedZone, counts)}
      data-zone={id}
      onClick={() => onSelectZone(id)}
      onMouseEnter={() => onHoverZone(id)}
      onMouseLeave={() => onHoverZone(null)}
    >
      {children}
    </g>
  )
}

export default function FocusFigureFallback({
  view,
  selectedZone,
  hoveredZone,
  counts,
  summary,
  onSelectZone,
  onHoverZone,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const countSummary = summary ?? FOCUS_ZONES
    .map((zone) => `${zone.label}: ${counts[zone.id] ?? 0}`)
    .join(', ')

  const zoneProps = { counts, hoveredZone, selectedZone, onSelectZone, onHoverZone }

  return (
    <svg
      className="focus-figure__svg"
      viewBox="0 0 220 360"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <title id={titleId}>{`Muscle focus mannequin, ${view} view`}</title>
      <desc id={descriptionId}>
        {`Stylized mannequin. Completed exercises this week — ${countSummary}.`}
      </desc>

      <ellipse className="focus-figure__shadow" cx="110" cy="345" rx="52" ry="7" />

      <rect className="focus-figure__body-alt" x="57" y="77" width="17" height="58" rx="8.5" transform="rotate(8 65.5 106)" />
      <rect className="focus-figure__body-alt" x="56" y="133" width="16" height="57" rx="8" transform="rotate(3 64 161.5)" />
      <ellipse className="focus-figure__body" cx="63" cy="195" rx="7.5" ry="10" />
      <rect className="focus-figure__body-alt" x="146" y="77" width="17" height="58" rx="8.5" transform="rotate(-8 154.5 106)" />
      <rect className="focus-figure__body-alt" x="148" y="133" width="16" height="57" rx="8" transform="rotate(-3 156 161.5)" />
      <ellipse className="focus-figure__body" cx="157" cy="195" rx="7.5" ry="10" />

      <rect className="focus-figure__body-alt" x="87" y="204" width="21" height="62" rx="10.5" transform="rotate(2 97.5 235)" />
      <rect className="focus-figure__body-alt" x="88" y="262" width="19" height="58" rx="9.5" transform="rotate(1 97.5 291)" />
      <ellipse className="focus-figure__body" cx="98" cy="331" rx="14" ry="8.5" />
      <rect className="focus-figure__body-alt" x="112" y="204" width="21" height="62" rx="10.5" transform="rotate(-2 122.5 235)" />
      <rect className="focus-figure__body-alt" x="113" y="262" width="19" height="58" rx="9.5" transform="rotate(-1 122.5 291)" />
      <ellipse className="focus-figure__body" cx="122" cy="331" rx="14" ry="8.5" />

      <path className="focus-figure__body" d="M81 72 Q110 63 139 72 L143 112 Q145 150 137 180 L83 180 Q75 150 77 112 Z" />
      <path className="focus-figure__body-alt" d="M83 179 L137 179 L133 212 Q110 220 87 212 Z" />
      <rect className="focus-figure__body-alt" x="101.5" y="50" width="17" height="14" rx="6" />
      <circle className="focus-figure__body" cx="110" cy="33" r="19.5" />

      {view === 'back' && (
        <>
          <path className="focus-figure__spine" d="M110 72 V178" />
          <ZoneGroup id="back" {...zoneProps}>
            <path d="M85 84 Q99 77 108 84 L106 116 Q94 122 86 111 Z" />
            <path d="M135 84 Q121 77 112 84 L114 116 Q126 122 134 111 Z" />
          </ZoneGroup>
        </>
      )}

      {view === 'front' && (
        <>
          <ZoneGroup id="chest" {...zoneProps}>
            <path d="M84 84 Q110 76 136 84 L133 112 Q110 120 87 112 Z" />
          </ZoneGroup>
          <ZoneGroup id="core" {...zoneProps}>
            <path d="M92 125 L128 125 L125 158 Q110 166 95 158 Z" />
          </ZoneGroup>
        </>
      )}

      <ZoneGroup id="shoulders" {...zoneProps}>
        <ellipse cx="77" cy="79" rx="13.5" ry="10" transform="rotate(-18 77 79)" />
        <ellipse cx="143" cy="79" rx="13.5" ry="10" transform="rotate(18 143 79)" />
      </ZoneGroup>

      <ZoneGroup id="arms" {...zoneProps}>
        <rect x="54.5" y="76" width="22" height="60" rx="10.5" transform="rotate(8 65.5 106)" />
        <rect x="54" y="132" width="20" height="59" rx="9.5" transform="rotate(3 64 161.5)" />
        <rect x="143.5" y="76" width="22" height="60" rx="10.5" transform="rotate(-8 154.5 106)" />
        <rect x="146" y="132" width="20" height="59" rx="9.5" transform="rotate(-3 156 161.5)" />
      </ZoneGroup>

      <ZoneGroup id="legs" {...zoneProps}>
        <rect x="85" y="202" width="25" height="65" rx="12" transform="rotate(2 97.5 234.5)" />
        <rect x="86" y="261" width="22" height="60" rx="10" transform="rotate(1 97 291)" />
        <rect x="110" y="202" width="25" height="65" rx="12" transform="rotate(-2 122.5 234.5)" />
        <rect x="112" y="261" width="22" height="60" rx="10" transform="rotate(-1 123 291)" />
      </ZoneGroup>
    </svg>
  )
}
