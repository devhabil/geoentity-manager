import {
  Building2,
  Calendar,
  Car,
  Copy,
  Pencil,
  Radio,
  Trash2,
  X,
} from 'lucide-react'
import type { Entity } from '../../../api/client'
import { TYPE_META } from '../constants'
import { formatCoord, formatTimestamp } from '../../../lib/format'
import { EntityTypeIcon } from './EntityTypeIcon'
import { StatusBadge } from './StatusBadge'

interface EntityDetailPanelProps {
  entity: Entity
  onClose: () => void
  onEdit: (entity: Entity) => void
  onDuplicate?: (entity: Entity) => void
  onDelete: (entity: Entity) => void
}

export function EntityDetailPanel({
  entity,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: EntityDetailPanelProps) {
  const typeLabel = TYPE_META[entity.type]?.label ?? entity.type

  const TypeSmallIcon =
    entity.type === 'vehicle'
      ? Car
      : entity.type === 'iot_sensor'
        ? Radio
        : Building2

  return (
    <section
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-label="Entity details"
      data-testid="entity-detail-panel"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <EntityTypeIcon
            type={entity.type}
            name={entity.name}
            status={entity.status}
            size="md"
          />
          <div className="min-w-0">
            <h2
              className="truncate text-base font-bold text-slate-900"
              data-testid="detail-entity-name"
            >
              {entity.name}
            </h2>
            <p className="text-xs text-slate-500">
              {typeLabel} • <span className="font-mono font-medium">{entity.code}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close detail panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab strip (Details active; matches mockup visual hierarchy) */}
      <div className="border-b border-slate-200 px-4">
        <div className="inline-flex items-center gap-1.5 border-b-2 border-brand py-2.5 text-xs font-semibold text-brand">
          <span>Details</span>
        </div>
      </div>

      {/* Attributes */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-4 text-sm">
        <div className="grid grid-cols-3 gap-2 py-3">
          <span className="font-medium text-slate-600">Entity Name</span>
          <span className="col-span-2 font-medium text-slate-900">{entity.name}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3">
          <span className="font-medium text-slate-600">Code</span>
          <span
            className="col-span-2 font-mono text-xs font-semibold text-slate-800"
            data-testid="detail-entity-code"
          >
            {entity.code}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center gap-2 py-3">
          <span className="font-medium text-slate-600">Type</span>
          <span className="col-span-2 inline-flex items-center gap-1.5 text-slate-800">
            <TypeSmallIcon className="h-4 w-4 text-slate-500" />
            {typeLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center gap-2 py-3">
          <span className="font-medium text-slate-600">Status</span>
          <div className="col-span-2" data-testid="detail-entity-status">
            <StatusBadge status={entity.status} withDot />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3">
          <span className="font-medium text-slate-600">Description</span>
          <span className="col-span-2 whitespace-pre-wrap text-slate-700">
            {entity.description || <em className="text-slate-400">No description provided</em>}
          </span>
        </div>

        {(entity.region || entity.address) && (
          <div className="grid grid-cols-3 gap-2 py-3">
            <span className="font-medium text-slate-600">Location</span>
            <div className="col-span-2 text-slate-700">
              {entity.address && <div>{entity.address}</div>}
              {entity.region && <div className="text-xs text-slate-500">{entity.region}</div>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 py-3">
          <span className="font-medium text-slate-600">Latitude</span>
          <span className="col-span-2 font-mono text-slate-800" data-testid="detail-entity-lat">
            {formatCoord(entity.latitude)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3">
          <span className="font-medium text-slate-600">Longitude</span>
          <span className="col-span-2 font-mono text-slate-800" data-testid="detail-entity-lng">
            {formatCoord(entity.longitude)}
          </span>
        </div>

        <div className="grid grid-cols-3 items-start gap-2 py-3">
          <span className="font-medium text-slate-600">Last Updated</span>
          <span className="col-span-2 inline-flex items-center gap-1.5 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {formatTimestamp(entity.updatedAt)}
          </span>
        </div>

        <div className="grid grid-cols-3 items-start gap-2 py-3">
          <span className="font-medium text-slate-600">Created</span>
          <span className="col-span-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {formatTimestamp(entity.createdAt)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-slate-100 p-3.5">
        <button
          type="button"
          onClick={() => onEdit(entity)}
          data-testid="detail-edit-btn"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        {onDuplicate && (
          <button
            type="button"
            onClick={() => onDuplicate(entity)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(entity)}
          data-testid="detail-delete-btn"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </section>
  )
}
