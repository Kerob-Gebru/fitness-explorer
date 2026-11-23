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
      viewBox="0 0 240 380"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <title id={titleId}>{`Anatomical muscle focus figure, ${view} view`}</title>
      <desc id={descriptionId}>
        {`Athletic anatomical figure. Completed exercises this week — ${countSummary}.`}
      </desc>

      <ellipse className="focus-figure__shadow" cx="120" cy="360" rx="64" ry="8.5" />
      <ellipse className="focus-figure__plinth-ring" cx="120" cy="360" rx="76" ry="11" />

      {/* Cranium, jaw, and neck */}
      <path
        className="focus-figure__body"
        d="M104 34 C104 17 136 17 136 34 C136 47 129 59 120 61 C111 59 104 47 104 34 Z"
      />
      <path
        className="focus-figure__body-alt"
        d="M111 57 L129 57 L133 73 Q120 77 107 73 Z"
      />

      {/* Torso base armature */}
      <path
        className="focus-figure__body"
        d="M84 79 Q120 68 156 79 L154 126 Q148 156 146 184 L94 184 Q92 156 86 126 Z"
      />
      <path
        className="focus-figure__body-alt"
        d="M94 183 L146 183 L143 218 Q120 227 97 218 Z"
      />

      {/* Hands */}
      <path
        className="focus-figure__body-alt"
        d="M52 197 Q57 195 61 200 L58 221 Q52 224 49 216 Z"
      />
      <path
        className="focus-figure__body-alt"
        d="M188 197 Q183 195 179 200 L182 221 Q188 224 191 216 Z"
      />

      {/* Feet */}
      <path
        className="focus-figure__body-alt"
        d="M96 345 L112 345 L114 358 Q103 362 93 356 Z"
      />
      <path
        className="focus-figure__body-alt"
        d="M144 345 L128 345 L126 358 Q137 362 147 356 Z"
      />

      {view === 'back' && (
        <>
          <path className="focus-figure__spine" d="M120 74 V186" />
          <ZoneGroup id="back" {...zoneProps}>
            {/* Trapezius */}
            <path d="M107 69 L120 65 L133 69 L146 84 L120 112 L94 84 Z" />
            {/* Latissimus dorsi V-taper */}
            <path d="M90 92 Q105 94 117 112 L115 152 Q101 146 92 126 Z" />
            <path d="M150 92 Q135 94 123 112 L125 152 Q139 146 148 126 Z" />
            {/* Spinal erectors */}
            <path d="M109 152 L118 152 L118 184 L107 182 Z" />
            <path d="M131 152 L122 152 L122 184 L133 182 Z" />
          </ZoneGroup>
        </>
      )}

      {view === 'front' && (
        <>
          <ZoneGroup id="chest" {...zoneProps}>
            {/* Bilateral pectoral plates */}
            <path d="M88 86 Q105 80 118 89 L118 117 Q101 122 89 111 Z" />
            <path d="M152 86 Q135 80 122 89 L122 117 Q139 122 151 111 Z" />
          </ZoneGroup>
          <ZoneGroup id="core" {...zoneProps}>
            {/* Rectus abdominis */}
            <rect x="106" y="124" width="12.5" height="12.5" rx="3.5" />
            <rect x="121.5" y="124" width="12.5" height="12.5" rx="3.5" />
            <rect x="106.5" y="139" width="12" height="12.5" rx="3.5" />
            <rect x="121.5" y="139" width="12" height="12.5" rx="3.5" />
            <rect x="107.5" y="154" width="11" height="14" rx="4" />
            <rect x="121.5" y="154" width="11" height="14" rx="4" />
            {/* Obliques */}
            <path d="M92 128 Q99 138 99 169 L104 172 Q103 144 97 128 Z" />
            <path d="M148 128 Q141 138 141 169 L136 172 Q137 144 143 128 Z" />
          </ZoneGroup>
        </>
      )}

      {/* Three-head deltoids */}
      <ZoneGroup id="shoulders" {...zoneProps}>
        <path d="M71 84 Q78 72 92 78 L88 103 Q74 104 68 95 Z" />
        <path d="M169 84 Q162 72 148 78 L152 103 Q166 104 172 95 Z" />
      </ZoneGroup>

      {/* Biceps / triceps & tapered forearms */}
      <ZoneGroup id="arms" {...zoneProps}>
        <path d="M68 98 Q78 96 86 104 L79 144 Q71 146 64 140 Z" />
        <path d="M62 145 Q71 143 77 148 L63 197 Q55 198 52 193 Z" />
        <path d="M172 98 Q162 96 154 104 L161 144 Q169 146 176 140 Z" />
        <path d="M178 145 Q169 143 163 148 L177 197 Q185 198 188 193 Z" />
      </ZoneGroup>

      {/* Quadriceps / hamstrings & gastrocnemius calves */}
      <ZoneGroup id="legs" {...zoneProps}>
        <path d="M93 212 Q107 210 117 218 L113 280 Q103 283 96 277 Z" />
        <path d="M147 212 Q133 210 123 218 L127 280 Q137 283 144 277 Z" />
        <path d="M97 286 Q106 283 113 288 L111 344 Q103 346 98 342 Q94 316 97 286 Z" />
        <path d="M143 286 Q134 283 127 288 L129 344 Q137 346 142 342 Q146 316 143 286 Z" />
      </ZoneGroup>
    </svg>
  )
}
