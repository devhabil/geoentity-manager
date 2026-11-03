import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Entity } from '../../../api/client'

interface DeleteConfirmDialogProps {
  entity: Entity
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmDialog({
  entity,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entity.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      data-testid="delete-confirm-dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-dialog-title" className="text-base font-bold text-slate-900">
              Delete Entity
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="font-semibold text-slate-900">{entity.name}</strong> (
              <span className="font-mono">{entity.code}</span>)? This action removes the
              entity from the map and database.
            </p>
            {error && (
              <div
                role="alert"
                className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            data-testid="confirm-delete-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete Entity
          </button>
        </div>
      </div>
    </div>
  )
}
