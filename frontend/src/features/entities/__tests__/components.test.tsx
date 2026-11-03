import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EntityDetailPanel } from '../components/EntityDetailPanel'
import { EntityFormDialog } from '../components/EntityFormDialog'
import { ApiError, type Entity } from '../../../api/client'

const sampleEntity: Entity = {
  id: '5b0c8a8e-3f7e-4d3f-9a43-2d5f3b0a9c11',
  code: 'DV-101',
  name: 'Delivery Vehicle DV-101',
  type: 'vehicle',
  status: 'active',
  description: 'Last-mile delivery vehicle for the San Francisco area.',
  region: 'San Francisco, CA',
  address: 'Near Market St',
  latitude: 37.7929,
  longitude: -122.411,
  createdAt: '2025-01-20T08:00:00Z',
  updatedAt: '2025-01-26T18:24:00Z',
}

describe('EntityDetailPanel', () => {
  it('renders entity details and triggers Edit, Delete, and Close callbacks', () => {
    const onClose = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <EntityDetailPanel
        entity={sampleEntity}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    expect(screen.getByTestId('detail-entity-name')).toHaveTextContent(
      'Delivery Vehicle DV-101',
    )
    expect(screen.getByTestId('detail-entity-code')).toHaveTextContent('DV-101')
    expect(screen.getByTestId('detail-entity-status')).toHaveTextContent('Active')
    expect(screen.getByTestId('detail-entity-lat')).toHaveTextContent('37.7929°')
    expect(screen.getByTestId('detail-entity-lng')).toHaveTextContent('-122.411°')

    fireEvent.click(screen.getByTestId('detail-edit-btn'))
    expect(onEdit).toHaveBeenCalledWith(sampleEntity)

    fireEvent.click(screen.getByTestId('detail-delete-btn'))
    expect(onDelete).toHaveBeenCalledWith(sampleEntity)
  })
})

describe('EntityFormDialog', () => {
  it('shows inline client validation errors when submitted invalid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <EntityFormDialog
        mode={{ kind: 'create' }}
        pickedCoords={null}
        pickingMap={false}
        onStartPickOnMap={vi.fn()}
        onCancelPickOnMap={vi.fn()}
        onClose={vi.fn()}
        onSubmitEntity={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: '95' } })
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('code is required')).toBeInTheDocument()
      expect(screen.getByText('name is required')).toBeInTheDocument()
      expect(
        screen.getByText('latitude must be between -90 and 90'),
      ).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('maps server 409/422 field errors onto form fields', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, {
        code: 'conflict',
        message: 'An entity with this code already exists.',
        details: [{ field: 'code', message: 'code already exists' }],
      }),
    )

    render(
      <EntityFormDialog
        mode={{ kind: 'edit', entity: sampleEntity }}
        pickedCoords={null}
        pickingMap={false}
        onStartPickOnMap={vi.fn()}
        onCancelPickOnMap={vi.fn()}
        onClose={vi.fn()}
        onSubmitEntity={onSubmit}
      />,
    )

    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('code already exists')).toBeInTheDocument()
      expect(screen.getByTestId('form-server-error')).toHaveTextContent(
        'An entity with this code already exists.',
      )
    })
  })
})
