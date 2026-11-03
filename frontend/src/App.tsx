import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import type { Entity } from './api/client'
import { Header, NavRail } from './components/LayoutShell'
import {
  useCreateEntity,
  useDeleteEntity,
  useEntities,
  useUpdateEntity,
} from './features/entities/hooks'
import {
  ENTITY_STATUSES,
  type EntityInput,
  type EntityStatus,
} from './features/entities/schema'
import { STATUS_META } from './features/entities/constants'
import { StatusCounters } from './features/entities/components/StatusCounters'
import { EntityList } from './features/entities/components/EntityList'
import { EntityMap } from './features/entities/components/EntityMap'
import { EntityDetailPanel } from './features/entities/components/EntityDetailPanel'
import {
  EntityFormDialog,
  type FormMode,
} from './features/entities/components/EntityFormDialog'
import { DeleteConfirmDialog } from './features/entities/components/DeleteConfirmDialog'

function readInitialSelectedId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('selected')
  } catch {
    return null
  }
}

export function App() {
  const { data: entities = [], isLoading, isError, error, refetch } = useEntities()
  const createMutation = useCreateEntity()
  const updateMutation = useUpdateEntity()
  const deleteMutation = useDeleteEntity()

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readInitialSelectedId(),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | EntityStatus>('all')

  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [pickingMap, setPickingMap] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)
  const [banner, setBanner] = useState<{
    kind: 'success' | 'error'
    text: string
  } | null>(null)

  // Keep ?selected=<id> in URL so selection survives refresh
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (selectedId) {
        url.searchParams.set('selected', selectedId)
      } else {
        url.searchParams.delete('selected')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore in test environments without full history URL
    }
  }, [selectedId])

  // Auto-select first entity on initial load if none selected
  useEffect(() => {
    if (!selectedId && entities.length > 0) {
      setSelectedId(entities[0].id)
    } else if (
      selectedId &&
      entities.length > 0 &&
      !entities.some((e) => e.id === selectedId)
    ) {
      setSelectedId(entities[0]?.id ?? null)
    }
  }, [entities, selectedId])

  // Auto-dismiss success banner
  useEffect(() => {
    if (banner?.kind !== 'success') return
    const timer = window.setTimeout(() => setBanner(null), 4000)
    return () => window.clearTimeout(timer)
  }, [banner])

  const filteredEntities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return entities.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) {
        return false
      }
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
      )
    })
  }, [entities, searchQuery, statusFilter])

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? null,
    [entities, selectedId],
  )

  const openCreateForm = (initial?: Partial<EntityInput>) => {
    setPickedCoords(null)
    setPickingMap(false)
    setFormMode({ kind: 'create', initial })
  }

  const openEditForm = (entity: Entity) => {
    setPickedCoords({ latitude: entity.latitude, longitude: entity.longitude })
    setPickingMap(false)
    setFormMode({ kind: 'edit', entity })
  }

  const openDuplicateForm = (entity: Entity) => {
    setPickedCoords({ latitude: entity.latitude, longitude: entity.longitude })
    setPickingMap(false)
    setFormMode({
      kind: 'create',
      initial: {
        code: '',
        name: `${entity.name} (Copy)`,
        type: entity.type,
        status: entity.status,
        description: entity.description,
        region: entity.region,
        address: entity.address,
        latitude: entity.latitude,
        longitude: entity.longitude,
      },
    })
  }

  const closeForm = () => {
    setFormMode(null)
    setPickingMap(false)
    setPickedCoords(null)
  }

  const handleSubmitForm = async (input: EntityInput) => {
    if (!formMode) return
    if (formMode.kind === 'create') {
      const created = await createMutation.mutateAsync(input)
      setSelectedId(created.id)
      setBanner({
        kind: 'success',
        text: `Created "${created.name}" (${created.code}).`,
      })
      closeForm()
    } else {
      const updated = await updateMutation.mutateAsync({
        id: formMode.entity.id,
        input,
      })
      setSelectedId(updated.id)
      setBanner({
        kind: 'success',
        text: `Updated "${updated.name}" (${updated.code}).`,
      })
      closeForm()
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    await deleteMutation.mutateAsync(target.id)
    if (selectedId === target.id) {
      setSelectedId(null)
    }
    setDeleteTarget(null)
    setBanner({
      kind: 'success',
      text: `Deleted "${target.name}" (${target.code}).`,
    })
  }

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <NavRail />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openCreateForm()}
              data-testid="add-entity-btn"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Add Entity
            </button>

            <div className="relative w-64 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entities by name, code, type, or location..."
                aria-label="Search entities"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="status-filter" className="font-semibold text-slate-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | EntityStatus)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="all">All Statuses</option>
                {ENTITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <StatusCounters entities={entities} />
        </div>

        {/* Status / feedback banner */}
        {banner && (
          <div
            role="status"
            data-testid="feedback-banner"
            className={`flex items-center justify-between gap-2 border-b px-5 py-2 text-xs font-medium ${
              banner.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{banner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="rounded p-0.5 hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Main 3-column workspace */}
        <main className="flex-1 overflow-hidden p-3.5">
          {isLoading ? (
            <div
              className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
              data-testid="loading-state"
            >
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
              <p className="mt-2 text-sm font-medium">Loading entities from server…</p>
            </div>
          ) : isError ? (
            <div
              role="alert"
              data-testid="error-state"
              className="flex h-full flex-col items-center justify-center rounded-xl border border-red-200 bg-white p-6 text-center"
            >
              <AlertCircle className="h-9 w-9 text-red-500" />
              <h2 className="mt-2 text-base font-bold text-slate-900">
                Could not load entities
              </h2>
              <p className="mt-1 max-w-md text-xs text-slate-600">
                {error instanceof Error
                  ? error.message
                  : 'Unable to reach the Go backend API.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <div className="grid h-full grid-cols-1 gap-3.5 lg:grid-cols-12">
              {/* Left Sidebar: Entity List */}
              <div className="h-64 min-h-0 lg:col-span-3 lg:h-full">
                <EntityList
                  entities={filteredEntities}
                  totalCount={entities.length}
                  selectedId={selectedEntity?.id ?? null}
                  onSelect={(e) => setSelectedId(e.id)}
                  onAddFirst={() => openCreateForm()}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                />
              </div>

              {/* Center: Interactive Map */}
              <div
                className={`min-h-[320px] lg:h-full ${
                  selectedEntity ? 'lg:col-span-6' : 'lg:col-span-9'
                }`}
              >
                <EntityMap
                  entities={filteredEntities}
                  selectedId={selectedEntity?.id ?? null}
                  onSelect={(e) => setSelectedId(e.id)}
                  pickingMode={pickingMap}
                  pickedCoords={pickedCoords}
                  onPickCoords={(coords) => {
                    setPickedCoords(coords)
                    setPickingMap(false)
                  }}
                />
              </div>

              {/* Right: Entity Detail Panel */}
              {selectedEntity && (
                <div className="h-80 min-h-0 lg:col-span-3 lg:h-full">
                  <EntityDetailPanel
                    entity={selectedEntity}
                    onClose={() => setSelectedId(null)}
                    onEdit={(e) => openEditForm(e)}
                    onDuplicate={(e) => openDuplicateForm(e)}
                    onDelete={(e) => setDeleteTarget(e)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create / Edit Modal */}
      {formMode && (
        <EntityFormDialog
          mode={formMode}
          pickedCoords={pickedCoords}
          pickingMap={pickingMap}
          onStartPickOnMap={() => setPickingMap(true)}
          onCancelPickOnMap={() => setPickingMap(false)}
          onClose={closeForm}
          onSubmitEntity={handleSubmitForm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmDialog
          entity={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}
