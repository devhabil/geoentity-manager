import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '../../../App'

const runLive = process.env.LIVE_BACKEND === '1'
const describeLive = runLive ? describe : describe.skip

describeLive('Live Go Backend + React Frontend End-to-End Integration', () => {
  let srv: ChildProcess | null = null
  let tempDir = ''
  const port = 18089
  const baseUrl = `http://localhost:${port}`

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'geo-live-e2e-'))
    const dbPath = join(tempDir, 'e2e.db')
    const serverBin = resolve(process.cwd(), '..', 'backend', 'bin', 'server.exe')

    // Patch global fetch so relative /api/... requests hit the live Go server
    const origFetch = globalThis.fetch
    globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/')) {
        return origFetch(`${baseUrl}${input}`, init)
      }
      return origFetch(input, init)
    }

    srv = spawn(serverBin, [], {
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: dbPath,
        SEED: 'true',
        CORS_ORIGINS: 'http://localhost:5173',
      },
      stdio: 'ignore',
    })

    // Wait for /healthz
    let ready = false
    for (let i = 0; i < 40; i++) {
      try {
        const res = await origFetch(`${baseUrl}/healthz`)
        if (res.ok) {
          ready = true
          break
        }
      } catch {
        // wait
      }
      await new Promise((r) => setTimeout(r, 200))
    }
    if (!ready) {
      throw new Error('Live Go server did not start on ' + baseUrl)
    }
  }, 20000)

  afterAll(async () => {
    if (srv) {
      srv.kill()
      await new Promise((r) => setTimeout(r, 400))
    }
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      } catch {
        // ignore Windows file lock delay
      }
    }
  })

  it('fetches 6 seeded entities from Go SQLite, executes Create, Update, Duplicate-code 409 validation, Delete, and persists across re-mount', async () => {
    const qc1 = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { unmount } = render(
      <QueryClientProvider client={qc1}>
        <App />
      </QueryClientProvider>,
    )

    // 1. Seeded entities loaded from live Go backend
    await waitFor(() => {
      expect(screen.getByTestId('entity-card-DV-101')).toBeInTheDocument()
      expect(screen.getByTestId('entity-card-TR-204')).toBeInTheDocument()
      expect(screen.getByTestId('entity-card-TS-01')).toBeInTheDocument()
      expect(screen.getByTestId('entity-card-AQ-07')).toBeInTheDocument()
      expect(screen.getByTestId('entity-card-WH-001')).toBeInTheDocument()
      expect(screen.getByTestId('entity-card-CS-02')).toBeInTheDocument()
    })
    expect(screen.getByTestId('counter-active')).toHaveTextContent('4')
    expect(screen.getByTestId('counter-inactive')).toHaveTextContent('1')
    expect(screen.getByTestId('counter-maintenance')).toHaveTextContent('1')

    // 2. Verify marker status colors in rendered Leaflet DOM
    expect(screen.getByTestId('map-marker-DV-101')).toHaveAttribute(
      'data-status',
      'active',
    )
    expect(screen.getByTestId('map-marker-TR-204')).toHaveAttribute(
      'data-status',
      'maintenance',
    )
    expect(screen.getByTestId('map-marker-AQ-07')).toHaveAttribute(
      'data-status',
      'inactive',
    )

    // 3. Create new entity via real POST /api/v1/entities
    fireEvent.click(screen.getByTestId('add-entity-btn'))
    fireEvent.change(screen.getByLabelText(/^Code/i), { target: { value: 'e2e-77' } })
    fireEvent.change(screen.getByLabelText(/Entity Name/i), {
      target: { value: 'E2E Test Sensor' },
    })
    const dlg = screen.getByTestId('entity-form-dialog')
    fireEvent.change(dlg.querySelector('#field-type')!, {
      target: { value: 'iot_sensor' },
    })
    fireEvent.change(dlg.querySelector('#field-latitude')!, {
      target: { value: '37.78' },
    })
    fireEvent.change(dlg.querySelector('#field-longitude')!, {
      target: { value: '-122.40' },
    })
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('entity-card-E2E-77')).toBeInTheDocument()
    })
    expect(screen.getByTestId('detail-entity-name')).toHaveTextContent('E2E Test Sensor')
    expect(screen.getByTestId('counter-active')).toHaveTextContent('5')

    // 4. Verify backend 409 duplicate code error surfaces in the form
    fireEvent.click(screen.getByTestId('add-entity-btn'))
    fireEvent.change(screen.getByLabelText(/^Code/i), { target: { value: 'E2E-77' } })
    fireEvent.change(screen.getByLabelText(/Entity Name/i), {
      target: { value: 'Duplicate Code Entity' },
    })
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('code already exists')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Cancel'))

    // 5. Update entity via real PUT /api/v1/entities/{id}
    fireEvent.click(screen.getByTestId('detail-edit-btn'))
    const editDlg = screen.getByTestId('entity-form-dialog')
    fireEvent.change(screen.getByLabelText(/Entity Name/i), {
      target: { value: 'E2E Sensor Calibrating' },
    })
    fireEvent.change(editDlg.querySelector('#field-status')!, {
      target: { value: 'maintenance' },
    })
    fireEvent.click(screen.getByTestId('entity-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('detail-entity-name')).toHaveTextContent(
        'E2E Sensor Calibrating',
      )
    })
    expect(screen.getByTestId('counter-maintenance')).toHaveTextContent('2')

    // 6. Simulate browser reload: unmount and mount with a fresh QueryClient
    unmount()
    const qc2 = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={qc2}>
        <App />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('entity-card-E2E-77')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('entity-card-E2E-77'))
    expect(screen.getByTestId('detail-entity-name')).toHaveTextContent(
      'E2E Sensor Calibrating',
    )

    // 7. Delete entity via real DELETE /api/v1/entities/{id}
    fireEvent.click(screen.getByTestId('detail-delete-btn'))
    fireEvent.click(screen.getByTestId('confirm-delete-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('entity-card-E2E-77')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('counter-maintenance')).toHaveTextContent('1')
  })
})
