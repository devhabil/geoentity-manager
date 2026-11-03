import type { EntityStatus, EntityType } from './schema'

export const TYPE_META: Record<
  EntityType,
  { label: string; pluralLabel: string }
> = {
  vehicle: { label: 'Vehicle', pluralLabel: 'Vehicles' },
  iot_sensor: { label: 'IoT Sensor', pluralLabel: 'IoT Sensors' },
  facility: { label: 'Facility', pluralLabel: 'Facilities' },
}

export const STATUS_META: Record<
  EntityStatus,
  {
    label: string
    legend: string
    hex: string
    dotClass: string
    badgeClass: string
    stripeClass: string
  }
> = {
  active: {
    label: 'Active',
    legend: 'Operating normally',
    hex: '#22a447',
    dotClass: 'bg-[#22a447]',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stripeClass: 'border-l-[#22a447]',
  },
  inactive: {
    label: 'Inactive',
    legend: 'Offline or not in service',
    hex: '#8a8f98',
    dotClass: 'bg-[#8a8f98]',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    stripeClass: 'border-l-[#8a8f98]',
  },
  maintenance: {
    label: 'Maintenance',
    legend: 'Under maintenance',
    hex: '#f59e0b',
    dotClass: 'bg-[#f59e0b]',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    stripeClass: 'border-l-[#f59e0b]',
  },
}

// Default map center: San Francisco Bay Area (matches seed data & mockup)
export const DEFAULT_MAP_CENTER: [number, number] = [37.765, -122.385]
export const DEFAULT_MAP_ZOOM = 12
