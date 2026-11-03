import { describe, expect, it } from 'vitest'
import { entityInputSchema } from '../schema'

const validPayload = () => ({
  code: 'DV-101',
  name: 'Delivery Vehicle DV-101',
  type: 'vehicle' as const,
  status: 'active' as const,
  description: 'Last-mile delivery vehicle',
  region: 'San Francisco, CA',
  address: 'Near Market St',
  latitude: 37.7929,
  longitude: -122.411,
})

describe('entityInputSchema (parity with Go backend validation)', () => {
  it('accepts valid payload and normalizes code to uppercase', () => {
    const res = entityInputSchema.safeParse({
      ...validPayload(),
      code: '  dv-101 ',
      name: '  Delivery Vehicle DV-101  ',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.code).toBe('DV-101')
      expect(res.data.name).toBe('Delivery Vehicle DV-101')
    }
  })

  it('accepts boundary coordinates (-90, 90, -180, 180, 0)', () => {
    for (const [lat, lng] of [
      [-90, -180],
      [90, 180],
      [0, 0],
    ]) {
      const res = entityInputSchema.safeParse({
        ...validPayload(),
        latitude: lat,
        longitude: lng,
      })
      expect(res.success).toBe(true)
    }
  })

  it('rejects out-of-range latitude and longitude with canonical messages', () => {
    const highLat = entityInputSchema.safeParse({ ...validPayload(), latitude: 90.001 })
    expect(highLat.success).toBe(false)
    if (!highLat.success) {
      expect(highLat.error.issues[0].message).toBe('latitude must be between -90 and 90')
    }

    const lowLat = entityInputSchema.safeParse({ ...validPayload(), latitude: -91 })
    expect(lowLat.success).toBe(false)

    const highLng = entityInputSchema.safeParse({ ...validPayload(), longitude: 181 })
    expect(highLng.success).toBe(false)
    if (!highLng.success) {
      expect(highLng.error.issues[0].message).toBe(
        'longitude must be between -180 and 180',
      )
    }

    const lowLng = entityInputSchema.safeParse({ ...validPayload(), longitude: -180.5 })
    expect(lowLng.success).toBe(false)
  })

  it('rejects missing coordinates', () => {
    const res = entityInputSchema.safeParse({
      ...validPayload(),
      latitude: '',
      longitude: undefined,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      const msgs = res.error.issues.map((i) => i.message)
      expect(msgs).toContain('latitude is required')
      expect(msgs).toContain('longitude is required')
    }
  })

  it('enforces code length and character rules', () => {
    const empty = entityInputSchema.safeParse({ ...validPayload(), code: '   ' })
    expect(empty.success).toBe(false)
    if (!empty.success) {
      expect(empty.error.issues[0].message).toBe('code is required')
    }

    const short = entityInputSchema.safeParse({ ...validPayload(), code: 'A' })
    expect(short.success).toBe(false)
    if (!short.success) {
      expect(short.error.issues[0].message).toBe('code must be 2-20 characters')
    }

    const long = entityInputSchema.safeParse({
      ...validPayload(),
      code: 'A'.repeat(21),
    })
    expect(long.success).toBe(false)

    const badChars = entityInputSchema.safeParse({ ...validPayload(), code: 'DV 101' })
    expect(badChars.success).toBe(false)
    if (!badChars.success) {
      expect(badChars.error.issues[0].message).toBe(
        'code may contain only letters, digits and hyphens',
      )
    }
  })

  it('enforces name, type, status, and max length constraints', () => {
    const noName = entityInputSchema.safeParse({ ...validPayload(), name: '  ' })
    expect(noName.success).toBe(false)
    if (!noName.success) {
      expect(noName.error.issues[0].message).toBe('name is required')
    }

    const badType = entityInputSchema.safeParse({
      ...validPayload(),
      type: 'drone' as unknown as 'vehicle',
    })
    expect(badType.success).toBe(false)

    const badStatus = entityInputSchema.safeParse({
      ...validPayload(),
      status: 'broken' as unknown as 'active',
    })
    expect(badStatus.success).toBe(false)

    const longDesc = entityInputSchema.safeParse({
      ...validPayload(),
      description: 'x'.repeat(501),
    })
    expect(longDesc.success).toBe(false)
  })
})
