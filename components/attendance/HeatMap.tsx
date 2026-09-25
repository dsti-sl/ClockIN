// components/attendance/HeatMap.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Attendee } from '@/lib/types'
import { clusterAttendees } from '@/lib/utils'

interface Props {
  attendees: Attendee[]
  centerLat?: number
  centerLng?: number
}

export default function HeatMap({ attendees, centerLat, centerLng }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let cancelled = false

    // Teardown before rebuild
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Load CSS first, then module
    const ensureCSS = () => {
      if (document.getElementById('leaflet-css')) return
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    ensureCSS()

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return

      // Fix webpack icon paths
      const proto = L.Icon.Default.prototype as unknown as Record<string, unknown>
      delete proto['_getIconUrl']
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const valid = attendees.filter(a => a.lat != null && a.lng != null)
      const lat   = centerLat ?? valid[0]?.lat ?? 8.484
      const lng   = centerLng ?? valid[0]?.lng ?? -13.234

      const map = L.map(containerRef.current!, {
        scrollWheelZoom: false,
      }).setView([lat, lng], 13)

      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Critical: invalidateSize after the container is fully painted
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize()
          }
        }, 150)
      })

      if (!valid.length) return

      const { green, red } = clusterAttendees(valid.map(a => ({ id: a.id, lat: a.lat!, lng: a.lng! })))

      valid.forEach(a => {
        const isGreen = green.has(a.id)
        const color   = isGreen ? '#16A34A' : '#DC2626'

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2.5px solid #fff;
            box-shadow:0 1px 4px rgba(0,0,0,.35)
          "></div>`,
          iconSize:   [14, 14],
          iconAnchor: [7, 7],
        })

        L.marker([a.lat!, a.lng!], { icon })
          .bindPopup(`
            <div style="font-size:12px;line-height:1.6;min-width:150px">
              <strong style="font-size:13px">${a.full_name}</strong><br/>
              ${a.institution ? `<span style="color:#6B7280">${a.institution}</span><br/>` : ''}
              ${a.mda ? `<span style="color:#6B7280">${a.mda}</span><br/>` : ''}
              ${a.designation ? `<span style="color:#6B7280">${a.designation}</span><br/>` : ''}
              <span style="color:${color};font-weight:600">
                ${isGreen ? '✓ Matched location' : '⚠ Different location'}
              </span>
              ${a.location_label ? `<br/><span style="color:#9CA3AF;font-size:11px">${a.location_label.replace(/\s*\(Entered by Admin\)$/i, '')}</span>` : ''}
            </div>
          `, { maxWidth: 220 })
          .addTo(map)
      })

      if (valid.length > 1) {
        const bounds = L.latLngBounds(valid.map(a => [a.lat!, a.lng!] as [number, number]))
        map.fitBounds(bounds, { padding: [48, 48] })
      }
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [attendees, centerLat, centerLng])

  // Stats
  const valid    = attendees.filter(a => a.lat != null && a.lng != null)
  const clusters = valid.length > 0
    ? clusterAttendees(valid.map(a => ({ id: a.id, lat: a.lat!, lng: a.lng! })))
    : { green: new Set<string>(), red: new Set<string>() }
  const matchedCount   = clusters.green.size
  const differentCount = clusters.red.size

  return (
    <div className="space-y-2">
      {/* Stats row */}
      {valid.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600 ring-1 ring-white ring-offset-1" />
            <strong className="text-gray-900 dark:text-white">{matchedCount}</strong> same location
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 ring-1 ring-white ring-offset-1" />
            <strong className="text-gray-900 dark:text-white">{differentCount}</strong> different location
          </span>
          <span className="ml-auto text-gray-400 dark:text-slate-400">{valid.length} / {attendees.length} with GPS</span>
        </div>
      )}

      {/* Map — full width, taller */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700"
        style={{ height: 420 }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Empty state overlay */}
        {valid.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 gap-2 pointer-events-none dark:bg-slate-900/80">
          <span className="text-2xl">📍</span>
          <p className="text-sm text-gray-500 dark:text-slate-200">No location data yet</p>
        </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[400] flex flex-col gap-1 rounded-xl border border-gray-200 bg-white/95 p-2.5 text-xs shadow backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <span className="font-semibold text-gray-700 mb-0.5 dark:text-white">Location map</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
            <span className="text-gray-600 dark:text-slate-200">Matched location</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            <span className="text-gray-600 dark:text-slate-200">Different location</span>
          </span>
        </div>
      </div>
    </div>
  )
}