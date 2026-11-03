import type { Entity } from '../../../api/client'
import { STATUS_META } from '../constants'
import { ENTITY_STATUSES } from '../schema'

interface StatusCountersProps {
  entities: Entity[]
}

export function StatusCounters({ entities }: StatusCountersProps) {
  const counts = {
    active: 0,
    inactive: 0,
    maintenance: 0,
  }
  for (const e of entities) {
    if (e.status in counts) {
      counts[e.status] += 1
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5" aria-label="Entity status counts">
      {ENTITY_STATUSES.map((status) => {
        const meta = STATUS_META[status]
        return (
          <div
            key={status}
            className="flex min-w-[116px] flex-col rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
              <span>{meta.label}</span>
            </div>
            <span
              className="mt-0.5 text-lg font-bold leading-tight text-slate-900"
              data-testid={`counter-${status}`}
            >
              {counts[status]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
