import { useState } from 'react'
import {
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Radio,
} from 'lucide-react'
import type { Entity } from '../../../api/client'
import { STATUS_META, TYPE_META } from '../constants'
import { ENTITY_TYPES, type EntityType } from '../schema'
import { EntityTypeIcon } from './EntityTypeIcon'
import { StatusBadge } from './StatusBadge'
import { formatCoord } from '../../../lib/format'

interface EntityListProps {
  entities: Entity[]
  totalCount: number
  selectedId: string | null
  onSelect: (entity: Entity) => void
  onAddFirst?: () => void
  hasActiveFilters: boolean
  onClearFilters?: () => void
}

const GROUP_ICONS: Record<EntityType, typeof Car> = {
  vehicle: Car,
  iot_sensor: Radio,
  facility: Building2,
}

export function EntityList({
  entities,
  totalCount,
  selectedId,
  onSelect,
  onAddFirst,
  hasActiveFilters,
  onClearFilters,
}: EntityListProps) {
  const [collapsed, setCollapsed] = useState<Record<EntityType, boolean>>({
    vehicle: false,
    iot_sensor: false,
    facility: false,
  })

  const toggleGroup = (t: EntityType) => {
    setCollapsed((prev) => ({ ...prev, [t]: !prev[t] }))
  }

  const grouped: Record<EntityType, Entity[]> = {
    vehicle: [],
    iot_sensor: [],
    facility: [],
  }
  for (const e of entities) {
    if (grouped[e.type]) {
      grouped[e.type].push(e)
    }
  }

  return (
    <aside
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-label="Entity list"
    >
      <div className="border-b border-slate-100 px-3.5 py-2.5">
        <div className="rounded-lg bg-slate-100/90 px-3 py-1.5 text-sm font-semibold text-slate-800">
          All Entities ({entities.length}
          {hasActiveFilters && totalCount !== entities.length ? ` of ${totalCount}` : ''})
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            <MapPin className="mb-2 h-8 w-8 text-slate-400" />
            {hasActiveFilters ? (
              <>
                <p className="text-sm font-medium text-slate-700">
                  No entities match your filter
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try adjusting your search query or status filter.
                </p>
                {onClearFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reset filters
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">No entities yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add your first vehicle, IoT sensor, or facility to display it on the map.
                </p>
                {onAddFirst && (
                  <button
                    type="button"
                    onClick={onAddFirst}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Entity
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          ENTITY_TYPES.map((type) => {
            const items = grouped[type]
            const GroupIcon = GROUP_ICONS[type]
            const isCollapsed = collapsed[type]

            return (
              <div key={type} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(type)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <GroupIcon className="h-4 w-4 text-slate-600" />
                  <span>
                    {TYPE_META[type].pluralLabel} ({items.length})
                  </span>
                </button>

                {!isCollapsed && items.length > 0 && (
                  <ul className="space-y-2">
                    {items.map((entity) => {
                      const isSelected = entity.id === selectedId
                      const statusMeta = STATUS_META[entity.status] ?? STATUS_META.inactive
                      const typeLabel = TYPE_META[entity.type]?.label ?? entity.type
                      const locationLine =
                        entity.address ||
                        `${formatCoord(entity.latitude)}, ${formatCoord(entity.longitude)}`

                      return (
                        <li key={entity.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(entity)}
                            data-testid={`entity-card-${entity.code}`}
                            className={`group flex w-full items-start gap-2.5 rounded-xl border border-l-4 p-2.5 text-left transition ${statusMeta.stripeClass} ${
                              isSelected
                                ? 'border-brand bg-brand-light/40 ring-2 ring-brand/25'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <EntityTypeIcon
                              type={entity.type}
                              name={entity.name}
                              status={entity.status}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {entity.name}
                                </span>
                                <StatusBadge status={entity.status} />
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                <span>{typeLabel}</span>
                                <span>•</span>
                                <span className="font-mono text-[11px] font-medium text-slate-600">
                                  {entity.code}
                                </span>
                                {entity.region && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{entity.region}</span>
                                  </>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{locationLine}</span>
                              </div>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
