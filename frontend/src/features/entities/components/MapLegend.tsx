import { STATUS_META } from '../constants'
import { ENTITY_STATUSES } from '../schema'

export function MapLegend() {
  return (
    <div
      className="pointer-events-auto rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-sm"
      aria-label="Entity status legend"
    >
      <div className="mb-1.5 text-xs font-semibold text-slate-800">
        Entity Status (Marker Color)
      </div>
      <ul className="space-y-1 text-xs text-slate-600">
        {ENTITY_STATUSES.map((s) => {
          const meta = STATUS_META[s]
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: meta.hex }}
              />
              <span>
                <strong className="font-semibold text-slate-800">{meta.label}</strong>{' '}
                – {meta.legend}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
