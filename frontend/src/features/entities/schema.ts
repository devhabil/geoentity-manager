import { z } from 'zod'

export const ENTITY_TYPES = ['vehicle', 'iot_sensor', 'facility'] as const
export const ENTITY_STATUSES = ['active', 'inactive', 'maintenance'] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
export type EntityStatus = (typeof ENTITY_STATUSES)[number]

const CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9-]*$/

const coordSchema = (field: 'latitude' | 'longitude', limit: number) =>
  z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      if (typeof val === 'string') {
        const trimmed = val.trim()
        if (trimmed === '') return undefined
        return Number(trimmed)
      }
      return val
    },
    z
      .number({
        required_error: `${field} is required`,
        invalid_type_error: `${field} is required`,
      })
      .refine((n) => Number.isFinite(n) && n >= -limit && n <= limit, {
        message: `${field} must be between -${limit} and ${limit}`,
      }),
  )

export const entityInputSchema = z.object({
  code: z
    .string({ required_error: 'code is required' })
    .transform((s) => s.trim().toUpperCase())
    .superRefine((val, ctx) => {
      if (val.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'code is required' })
      } else if (val.length < 2 || val.length > 20) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'code must be 2-20 characters' })
      } else if (!CODE_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'code may contain only letters, digits and hyphens',
        })
      }
    }),
  name: z
    .string({ required_error: 'name is required' })
    .transform((s) => s.trim())
    .superRefine((val, ctx) => {
      if (val.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'name is required' })
      } else if (val.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'name must be at most 100 characters',
        })
      }
    }),
  type: z.enum(ENTITY_TYPES, {
    errorMap: () => ({ message: 'type must be one of: vehicle, iot_sensor, facility' }),
  }),
  status: z.enum(ENTITY_STATUSES, {
    errorMap: () => ({ message: 'status must be one of: active, inactive, maintenance' }),
  }),
  description: z
    .string()
    .optional()
    .default('')
    .transform((s) => s.trim())
    .refine((s) => s.length <= 500, {
      message: 'description must be at most 500 characters',
    }),
  region: z
    .string()
    .optional()
    .default('')
    .transform((s) => s.trim())
    .refine((s) => s.length <= 100, {
      message: 'region must be at most 100 characters',
    }),
  address: z
    .string()
    .optional()
    .default('')
    .transform((s) => s.trim())
    .refine((s) => s.length <= 200, {
      message: 'address must be at most 200 characters',
    }),
  latitude: coordSchema('latitude', 90),
  longitude: coordSchema('longitude', 180),
})

export type EntityInput = z.output<typeof entityInputSchema>
export type EntityFormValues = EntityInput

