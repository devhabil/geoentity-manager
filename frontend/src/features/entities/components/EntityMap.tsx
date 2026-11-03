import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  Popup,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { Entity } from '../../../api/client'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  STATUS_META,
  TYPE_META,
} from '../constants'
import { formatCoord, isValidCoordinates, roundCoord } from '../../../lib/format'
import { MapLegend } from './MapLegend'

interface EntityMapProps {
  entities: Entity[]
  selectedId: string | null
  onSelect: (entity: Entity) => void
  pickingMode: boolean
  pickedCoords: { latitude: number; longitude: number } | null
  onPickCoords: (coords: { latitude: number; longitude: number }) => void
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getMarkerSvgGlyph(entity: Entity): string {
  const lower = entity.name.toLowerCase()
  if (entity.type === 'vehicle') {
    if (lower.includes('truck')) {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`
    }
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
  }
  if (entity.type === 'iot_sensor') {
    if (lower.includes('temp')) {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`
    }
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`
  }
  if (lower.includes('charg')) {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
  }
  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>`
}

function buildEntityDivIcon(entity: Entity, isSelected: boolean): L.DivIcon {
  const statusMeta = STATUS_META[entity.status] ?? STATUS_META.inactive
  const color = statusMeta.hex
  const code = escapeHtml(entity.code)
  const glyph = getMarkerSvgGlyph(entity)
  const ringStyle = isSelected
    ? 'box-shadow: 0 0 0 4px rgba(29,110,240,0.45), 0 4px 10px rgba(15,23,42,0.28); transform: scale(1.08);'
    : 'box-shadow: 0 3px 8px rgba(15,23,42,0.24);'

  const html = `
    <div data-testid="map-marker-${code}" data-status="${escapeHtml(entity.status)}" style="display:inline-flex;align-items:center;gap:4px;transform:translate(-16px,-34px);">
      <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;display:flex;align-items:center;justify-content:center;${ringStyle}">
        ${glyph}
        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color};"></div>
      </div>
      <span style="background:#ffffff;color:#0f172a;font-weight:700;font-size:11px;line-height:1;padding:4px 7px;border-radius:6px;border:1px solid #e2e8f0;box-shadow:0 2px 5px rgba(15,23,42,0.14);white-space:nowrap;">
        ${code}
      </span>
    </div>
  `

  return L.divIcon({
    className: 'entity-marker-wrapper',
    html,
    iconSize: [96, 38],
    iconAnchor: [0, 0],
  })
}

function buildPickedLocationIcon(): L.DivIcon {
  const html = `
    <div style="transform:translate(-14px,-28px);display:flex;align-items:center;gap:4px;">
      <div style="width:28px;height:28px;border-radius:9999px;background:#1d6ef0;border:2.5px solid #ffffff;box-shadow:0 0 0 4px rgba(29,110,240,0.35),0 3px 8px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">+</div>
      <span style="background:#1d6ef0;color:#fff;font-weight:600;font-size:11px;padding:3px 6px;border-radius:6px;white-space:nowrap;">Selected point</span>
    </div>
  `
  return L.divIcon({
    className: 'entity-marker-wrapper',
    html,
    iconSize: [110, 32],
    iconAnchor: [0, 0],
  })
}

function MapFlyToSelected({ selected }: { selected: Entity | null }) {
  const map = useMap()
  useEffect(() => {
    if (selected && isValidCoordinates(selected.latitude, selected.longitude)) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 13), {
        duration: 0.5,
      })
    }
  }, [map, selected])
  return null
}

function MapClickPicker({
  enabled,
  onPick,
}: {
  enabled: boolean
  onPick: (coords: { latitude: number; longitude: number }) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      const lat = Math.max(-90, Math.min(90, roundCoord(e.latlng.lat)))
      const lng = Math.max(-180, Math.min(180, roundCoord(e.latlng.lng)))
      onPick({ latitude: lat, longitude: lng })
    },
  })
  return null
}

export function EntityMap({
  entities,
  selectedId,
  onSelect,
  pickingMode,
  pickedCoords,
  onPickCoords,
}: EntityMapProps) {
  const validEntities = useMemo(
    () => entities.filter((e) => isValidCoordinates(e.latitude, e.longitude)),
    [entities],
  )

  const selectedEntity = useMemo(
    () => validEntities.find((e) => e.id === selectedId) ?? null,
    [validEntities, selectedId],
  )

  const pickedIcon = useMemo(() => buildPickedLocationIcon(), [])

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm ${
        pickingMode ? 'ring-2 ring-brand' : ''
      }`}
      data-testid="entity-map-container"
    >
      {pickingMode && (
        <div
          className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4"
          data-testid="map-pick-banner"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
            <span>Click anywhere on the map to set Latitude & Longitude</span>
          </div>
        </div>
      )}

      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={true}
        className={`h-full w-full ${pickingMode ? 'cursor-crosshair' : ''}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ScaleControl position="bottomright" />
        <MapFlyToSelected selected={selectedEntity} />
        <MapClickPicker enabled={pickingMode} onPick={onPickCoords} />

        {validEntities.map((entity) => {
          const isSelected = entity.id === selectedId
          const icon = buildEntityDivIcon(entity, isSelected)
          const typeLabel = TYPE_META[entity.type]?.label ?? entity.type
          const statusMeta = STATUS_META[entity.status] ?? STATUS_META.inactive

          return (
            <Marker
              key={`${entity.id}-${entity.status}-${entity.code}-${isSelected ? 'sel' : 'norm'}`}
              position={[entity.latitude, entity.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (pickingMode) {
                    onPickCoords({
                      latitude: roundCoord(entity.latitude),
                      longitude: roundCoord(entity.longitude),
                    })
                  } else {
                    onSelect(entity)
                  }
                },
              }}
            >
              <Popup>
                <div className="min-w-[170px] text-xs">
                  <div className="font-bold text-slate-900">{entity.name}</div>
                  <div className="mt-0.5 text-slate-500">
                    {typeLabel} • <span className="font-mono">{entity.code}</span>
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 font-medium text-slate-700">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusMeta.hex }}
                    />
                    {statusMeta.label}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-500">
                    {formatCoord(entity.latitude)}, {formatCoord(entity.longitude)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {pickedCoords &&
          isValidCoordinates(pickedCoords.latitude, pickedCoords.longitude) && (
            <Marker
              position={[pickedCoords.latitude, pickedCoords.longitude]}
              icon={pickedIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker
                  const pos = m.getLatLng()
                  onPickCoords({
                    latitude: roundCoord(pos.lat),
                    longitude: roundCoord(pos.lng),
                  })
                },
              }}
            />
          )}
      </MapContainer>

      {/* Bottom-left Legend overlay */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30">
        <MapLegend />
      </div>
    </div>
  )
}
