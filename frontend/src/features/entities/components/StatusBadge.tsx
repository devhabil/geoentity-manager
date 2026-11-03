import { STATUS_META } from '../constants'
import type { EntityStatus } from '../schema'

interface StatusBadgeProps {
  status: EntityStatus
  withDot?: boolean
}

export function StatusBadge({ status, withDot = false }: StatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.inactive
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
    >
      {withDot && <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />}
      {meta.label}
    </span>
  )
}
