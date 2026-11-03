import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Crosshair, Loader2, X } from 'lucide-react'
import { ApiError, type Entity } from '../../../api/client'
import {
  ENTITY_STATUSES,
  ENTITY_TYPES,
  entityInputSchema,
  type EntityFormValues,
  type EntityInput,
} from '../schema'
import { STATUS_META, TYPE_META } from '../constants'

export type FormMode =
  | { kind: 'create'; initial?: Partial<EntityInput> }
  | { kind: 'edit'; entity: Entity }

interface EntityFormDialogProps {
  mode: FormMode
  pickedCoords: { latitude: number; longitude: number } | null
  pickingMap: boolean
  onStartPickOnMap: () => void
  onCancelPickOnMap: () => void
  onClose: () => void
  onSubmitEntity: (input: EntityInput) => Promise<void>
}

const VALID_FIELD_NAMES = new Set<keyof EntityFormValues>([
  'code',
  'name',
  'type',
  'status',
  'description',
  'region',
  'address',
  'latitude',
  'longitude',
])

export function EntityFormDialog({
  mode,
  pickedCoords,
  pickingMap,
  onStartPickOnMap,
  onCancelPickOnMap,
  onClose,
  onSubmitEntity,
}: EntityFormDialogProps) {
  const isEdit = mode.kind === 'edit'
  const [serverError, setServerError] = useState<string | null>(null)

  const defaultValues: EntityFormValues =
    mode.kind === 'edit'
      ? {
          code: mode.entity.code,
          name: mode.entity.name,
          type: mode.entity.type,
          status: mode.entity.status,
          description: mode.entity.description,
          region: mode.entity.region,
          address: mode.entity.address,
          latitude: mode.entity.latitude,
          longitude: mode.entity.longitude,
        }
      : {
          code: mode.initial?.code ?? '',
          name: mode.initial?.name ?? '',
          type: mode.initial?.type ?? 'vehicle',
          status: mode.initial?.status ?? 'active',
          description: mode.initial?.description ?? '',
          region: mode.initial?.region ?? 'San Francisco, CA',
          address: mode.initial?.address ?? '',
          latitude: mode.initial?.latitude ?? 37.7749,
          longitude: mode.initial?.longitude ?? -122.4194,
        }

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntityInput>({
    resolver: zodResolver(entityInputSchema),
    defaultValues,
  })

  useEffect(() => {
    if (pickedCoords) {
      setValue('latitude', pickedCoords.latitude, { shouldValidate: true, shouldDirty: true })
      setValue('longitude', pickedCoords.longitude, { shouldValidate: true, shouldDirty: true })
    }
  }, [pickedCoords, setValue])

  const onSubmit = async (values: EntityInput) => {
    setServerError(null)
    try {
      await onSubmitEntity(values)
    } catch (err) {
      if (err instanceof ApiError) {
        let mappedAny = false
        for (const d of err.details) {
          if (VALID_FIELD_NAMES.has(d.field as keyof EntityFormValues)) {
            setError(d.field as keyof EntityFormValues, {
              type: 'server',
              message: d.message,
            })
            mappedAny = true
          }
        }
        if (!mappedAny || err.details.length === 0) {
          setServerError(err.message)
        } else {
          setServerError(err.message)
        }
      } else if (err instanceof Error) {
        setServerError(err.message)
      } else {
        setServerError('Failed to save entity.')
      }
    }
  }

  // When picking on the map, collapse the modal into a compact floating bar so the map is unobstructed.
  if (pickingMap) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-brand/30 bg-white px-4 py-3 shadow-xl"
        data-testid="map-picker-floating-bar"
      >
        <div className="text-xs">
          <div className="font-semibold text-slate-900">
            Map coordinate selection active
          </div>
          <div className="text-slate-500">
            Click any location on the map to set coordinates.
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelPickOnMap}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Done picking
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-form-title"
      data-testid="entity-form-dialog"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="entity-form-title" className="text-base font-bold text-slate-900">
              {isEdit ? `Edit ${mode.entity.name}` : 'Add New Entity'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Update entity attributes or geographic coordinates.'
                : 'Enter entity attributes and coordinates or pick a point on the map.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 text-xs"
        >
          {serverError && (
            <div
              role="alert"
              data-testid="form-server-error"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            >
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="field-code" className="mb-1 block font-semibold text-slate-700">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                id="field-code"
                type="text"
                placeholder="e.g. DV-105"
                {...register('code')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono uppercase text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.code && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.code.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="field-name" className="mb-1 block font-semibold text-slate-700">
                Entity Name <span className="text-red-500">*</span>
              </label>
              <input
                id="field-name"
                type="text"
                placeholder="e.g. Delivery Vehicle DV-105"
                {...register('name')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.name && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="field-type" className="mb-1 block font-semibold text-slate-700">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="field-type"
                {...register('type')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="field-status" className="mb-1 block font-semibold text-slate-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="field-status"
                {...register('status')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {ENTITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          {/* Coordinates section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                Geographic Coordinates (WGS84)
              </span>
              <button
                type="button"
                onClick={onStartPickOnMap}
                data-testid="pick-on-map-btn"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Pick on Map
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="field-latitude" className="mb-1 block font-medium text-slate-600">
                  Latitude (−90 to 90) <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-latitude"
                  type="number"
                  step="any"
                  {...register('latitude')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                {errors.latitude && (
                  <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="field-longitude" className="mb-1 block font-medium text-slate-600">
                  Longitude (−180 to 180) <span className="text-red-500">*</span>
                </label>
                <input
                  id="field-longitude"
                  type="number"
                  step="any"
                  {...register('longitude')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                {errors.longitude && (
                  <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                    {errors.longitude.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="field-region" className="mb-1 block font-semibold text-slate-700">
                Region / City
              </label>
              <input
                id="field-region"
                type="text"
                placeholder="e.g. San Francisco, CA"
                {...register('region')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.region && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.region.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="field-address" className="mb-1 block font-semibold text-slate-700">
                Address / Landmark
              </label>
              <input
                id="field-address"
                type="text"
                placeholder="e.g. Near Market St"
                {...register('address')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.address && (
                <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="field-description" className="mb-1 block font-semibold text-slate-700">
              Description
            </label>
            <textarea
              id="field-description"
              rows={3}
              placeholder="Operational notes or role description..."
              {...register('description')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="entity-form-submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
