import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '../../../App'
import type { Entity } from '../../../api/client'

// Mock EntityMap with a lightweight interactive test double so jsdom tests can
// verify markers, status colors, marker clicks, and map-click coordinate picking.
vi.mock('../components/EntityMap', () => ({
  EntityMap: ({
    entities,
    selectedId,
    onSelect,
    pickingMode,
    onPickCoords,
  }: {
    entities: Entity[]
    selectedId: string | null
    onSelect: (e: Entity) => void
    pickingMode: boolean
    onPickCoords: (c: { latitude: number; longitude: number }) => void
  }) => (
    <div data-testid="mock-map" data-picking={pickingMode ? 'true' : 'false'}>
      <button
        type="button"
        data-testid="simulate-map-click"
        onClick={() => onPickCoords({ latitude: 37.801234, longitude: -122.405678 })}
      >
        Click map
      </button>
      {entities.map((e) => (
        <button
          key={e.id}
          type="button"
          data-testid={`map-marker-${e.code}`}
          data-status={e.status}
          data-selected={e.id === selectedId ? 'true' : 'false'}
          onClick={() => onSelect(e)}
        >
          {e.code}
        </button>
      ))}
    </div>
  ),
}))

const initialSeed: Entity[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'DV-101',
    name: 'Delivery Vehicle DV-101',
    type: 'vehicle',
    status: 'active',
    description: 'Last-mile delivery vehicle',
    region: 'San Francisco, CA',
    address: 'Near Market St',
    latitude: 37.7929,
    longitude: -122.411,
    createdAt: '2025-01-20T08:00:00Z',
    updatedAt: '2025-01-26T18:24:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'TR-204',
    name: 'Truck TR-204',
    type: 'vehicle',
    status: 'maintenance',
    description: 'Scheduled maintenance',
    region: 'Oakland, CA',
    address: 'I-880 (Oakland)',
    latitude: 37.799,
    longitude: -122.284,
    createdAt: '2025-01-20T08:00:00Z',
    updatedAt: '2025-01-26T18:24:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    code: 'AQ-07',
    name: 'Air Quality Sensor AQ-07',
    type: 'iot_sensor',
    status: 'inactive',
    description: 'Offline sensor',
    region: 'Mission District',
    address: 'Mission St',
    latitude: 37.7599,
    longitude: -122.4148,
    createdAt: '2025-01-20T08:00:00Z',
    updatedAt: '2025-01-26T18:24:00Z',
  },
]

describe('App full CRUD & map integration flow', () => {
  let db: Entity[]

  beforeEach(() => {
    db = [...initialSeed]
    window.history.replaceState({}, '', '/')

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString()
      const method = (init?.method ?? 'GET').toUpperCase()

      if (url.endsWith('/api/v1/entities') && method === 'GET') {
        return new Response(JSON.stringify({ data: db }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.endsWith('/api/v1/entities') && method === 'POST') {
        const body = JSON.parse(String(init?.body ?? '{}'))
        const created: Entity = {
          ...body,
          id: '44444444-4444-4444-8444-444444444444',
          createdAt: '2025-02-01T10:00:00Z',
          updatedAt: '2025-02-01T10:00:00Z',
        }
        db = [...db, created]
        return new Response(JSON.stringify({ data: created }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/api/v1/entities/') && method === 'PUT') {
        const id = decodeURIComponent(url.split('/').pop()!)
        const body = JSON.parse(String(init?.body ?? '{}'))
        let updated: Entity | undefined
        db = db.map((item) => {
          if (item.id === id) {
            const next: Entity = {
              ...item,
              ...body,
              updatedAt: '2025-02-02T12:00:00Z',
            }
            updated = next
            return next
          }
          return item
        })
        return new Response(JSON.stringify({ data: updated }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/api/v1/entities/') && method === 'DELETE') {
        const id = decodeURIComponent(url.split('/').pop()!)
        db = db.filter((item) => item.id !== id)
        return new Response(null, { status: 204 })
      }

      return new Response(
        JSON.stringify({ error: { code: 'not_found', message: 'Not found' } }),
        { status: 404 },
      )
    })
  })

  it('loads entities, selects via marker/list, picks coordinates on map, creates, edits, and deletes', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    )

    // 1. Displays entities and status counters
    await waitFor(() => {
      expect(screen.getByTestId('entity-card-DV-101')).toBeInTheDocument()
    })
    expect(screen.getByTestId('counter-active')).toHaveTextContent('1')
    expect(screen.getByTestId('counter-maintenance')).toHaveTextContent('1')
    expect(screen.getByTestId('counter-inactive')).toHaveTextContent('1')

    // 2. Clicking a marker selects the entity and opens the detail panel
    fireEvent.click(screen.getByTestId('map-marker-TR-204'))
    expect(screen.getByTestId('detail-entity-name')).toHaveTextContent('Truck TR-204')
    expect(screen.getByTestId('detail-entity-code')).toHaveTextContent('TR-204')

    // 3. Create Entity with coordinate selection by clicking the map
    fireEvent.click(screen.getByTestId('add-entity-btn'))
    expect(screen.getByTestId('entity-form-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pick-on-map-btn'))
    expect(screen.getByTestId('map-picker-floating-bar')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('simulate-map-click'))

    await waitFor(() => {
      expect(screen.getByTestId('entity-form-dialog')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Latitude/i)).toHaveValue(37.801234)
    expect(screen.getByLabelText(/Longitude/i)).toHaveValue(-122.405678)

    fireEvent.change(screen.getByLabelText(/^Code/i), { target: { value: 'wh-09' } })
    fireEvent.change(screen.getByLabelText(/Entity Name/i), {
      target: { value: 'North Pier Hub' },
    })
    fireEvent.change(screen.getByLabelText(/^Type/i), { target: { value: 'facility' } })
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('entity-card-WH-09')).toBeInTheDocument()
    })
    expect(screen.getByTestId('detail-entity-name')).toHaveTextContent('North Pier Hub')
    expect(screen.getByTestId('counter-active')).toHaveTextContent('2')

    // 4. Edit Entity
    fireEvent.click(screen.getByTestId('detail-edit-btn'))
    fireEvent.change(screen.getByLabelText(/Entity Name/i), {
      target: { value: 'North Pier Hub Updated' },
    })
    fireEvent.change(
      screen.getByTestId('entity-form-dialog').querySelector('#field-status')!,
      { target: { value: 'maintenance' } },
    )
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('detail-entity-name')).toHaveTextContent(
        'North Pier Hub Updated',
      )
    })
    expect(screen.getByTestId('counter-maintenance')).toHaveTextContent('2')

    // 5. Delete Entity with confirmation dialog
    fireEvent.click(screen.getByTestId('detail-delete-btn'))
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('entity-card-WH-09')).not.toBeInTheDocument()
    })
  })

  it('filters entities by search query and status, and shows empty filter state', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('entity-card-DV-101')).toBeInTheDocument()
    })

    // Filter by status = maintenance -> only TR-204 remains
    fireEvent.change(screen.getByLabelText(/Status:/i), {
      target: { value: 'maintenance' },
    })
    expect(screen.getByTestId('entity-card-TR-204')).toBeInTheDocument()
    expect(screen.queryByTestId('entity-card-DV-101')).not.toBeInTheDocument()

    // Search for non-existent string -> empty filter state
    fireEvent.change(screen.getByLabelText(/Search entities/i), {
      target: { value: 'nonexistent-xyz' },
    })
    expect(screen.getByText(/No entities match your filter/i)).toBeInTheDocument()

    // Reset filters button restores list
    fireEvent.click(screen.getByText(/Reset filters/i))
    expect(screen.getByTestId('entity-card-DV-101')).toBeInTheDocument()
    expect(screen.getByTestId('entity-card-AQ-07')).toBeInTheDocument()
  })

  it('displays error state and retries when backend request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Backend offline'))

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/Backend offline/i)).toBeInTheDocument()
  })
})
