import type { EntityInput, EntityType, EntityStatus } from '../features/entities/schema'

export interface Entity extends EntityInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorPayload {
  code: string
  message: string
  details?: FieldError[]
}

export class ApiError extends Error {
  status: number
  code: string
  details: FieldError[]

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = payload.code || 'unknown_error'
    this.details = payload.details ?? []
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 204) {
    return undefined as T
  }

  let body: { data?: T; error?: ApiErrorPayload } | null = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    const errPayload: ApiErrorPayload = body?.error ?? {
      code: 'http_error',
      message: `HTTP ${res.status} ${res.statusText}`,
    }
    throw new ApiError(res.status, errPayload)
  }

  if (!body || !('data' in body)) {
    throw new ApiError(res.status, {
      code: 'invalid_response',
      message: 'Malformed API response envelope.',
    })
  }

  return body.data as T
}

export interface EntityFilterParams {
  type?: EntityType
  status?: EntityStatus
  q?: string
}

export const entityApi = {
  list(params?: EntityFilterParams): Promise<Entity[]> {
    const search = new URLSearchParams()
    if (params?.type) search.set('type', params.type)
    if (params?.status) search.set('status', params.status)
    if (params?.q) search.set('q', params.q)
    const qs = search.toString()
    return request<Entity[]>(`/api/v1/entities${qs ? `?${qs}` : ''}`)
  },

  get(id: string): Promise<Entity> {
    return request<Entity>(`/api/v1/entities/${encodeURIComponent(id)}`)
  },

  create(input: EntityInput): Promise<Entity> {
    return request<Entity>('/api/v1/entities', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  update(id: string, input: EntityInput): Promise<Entity> {
    return request<Entity>(`/api/v1/entities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  remove(id: string): Promise<void> {
    return request<void>(`/api/v1/entities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },
}
