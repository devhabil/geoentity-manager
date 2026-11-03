import {
  Building2,
  Car,
  Radio,
  Thermometer,
  Truck,
  Wind,
  Zap,
} from 'lucide-react'
import type { EntityStatus, EntityType } from '../schema'
import { STATUS_META } from '../constants'

interface EntityTypeIconProps {
  type: EntityType
  name?: string
  status?: EntityStatus
  size?: 'sm' | 'md'
}

export function EntityTypeIcon({
  type,
  name = '',
  status = 'active',
  size = 'md',
}: EntityTypeIconProps) {
  const lower = name.toLowerCase()
  const meta = STATUS_META[status] ?? STATUS_META.active

  const boxSize = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  const bgMap: Record<EntityStatus, string> = {
    active: 'bg-emerald-50 text-[#22a447]',
    inactive: 'bg-slate-100 text-[#8a8f98]',
    maintenance: 'bg-amber-50 text-[#f59e0b]',
  }

  let Icon = Car
  if (type === 'vehicle') {
    Icon = lower.includes('truck') ? Truck : Car
  } else if (type === 'iot_sensor') {
    if (lower.includes('temp')) Icon = Thermometer
    else if (lower.includes('air') || lower.includes('quality')) Icon = Wind
    else Icon = Radio
  } else if (type === 'facility') {
    Icon = lower.includes('charg') ? Zap : Building2
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${boxSize} ${bgMap[status] ?? 'bg-emerald-50'}`}
      style={{ color: meta.hex }}
      aria-hidden="true"
    >
      <Icon className={iconSize} />
    </div>
  )
}
