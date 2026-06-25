'use client'

import { useState } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import type { MapMouseEvent } from '@vis.gl/react-google-maps'
import { Button } from '@/components/ui/button'
import type { IssueLocation } from '@/types'

interface StepLocationProps {
  location: Partial<IssueLocation> | null
  onChange: (location: Partial<IssueLocation>) => void
  onNext: () => void
  onBack: () => void
}

function MapPicker({
  onChange,
}: {
  onChange: (loc: Partial<IssueLocation>) => void
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null)

  function handleClick(e: MapMouseEvent) {
    if (!e.detail.latLng) return
    const lat = e.detail.latLng.lat
    const lng = e.detail.latLng.lng
    setMarker({ lat, lng })
    onChange({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, wardId: 'demo-ward', wardName: 'Demo Ward', geohash: '' })
  }

  return (
    <Map
      className="w-full h-[300px] rounded-lg"
      defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
      defaultZoom={14}
      gestureHandling="greedy"
      disableDefaultUI
      onClick={handleClick}
      mapId="issue-location-picker"
    >
      {marker && <AdvancedMarker position={marker} />}
    </Map>
  )
}

export function StepLocation({ location, onChange, onNext, onBack }: StepLocationProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Tap the map to pin the exact location of the issue.</p>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <MapPicker onChange={onChange} />
      </APIProvider>
      {location?.lat && (
        <p className="text-xs text-slate-500">
          Pinned: {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext} disabled={!location?.lat}>
          Next: Describe Issue
        </Button>
      </div>
    </div>
  )
}
