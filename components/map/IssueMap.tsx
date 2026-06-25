'use client'

import { useEffect, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import { subscribeToIssues } from '@/lib/firebase/issues'
import { Issue, severityColor } from '@/types'
import Link from 'next/link'

const MARKER_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#facc15',
  orange: '#f97316',
  red: '#dc2626',
}

export function IssueMap() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [selected, setSelected] = useState<Issue | null>(null)

  useEffect(() => {
    return subscribeToIssues(setIssues, 200)
  }, [])

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
        defaultZoom={13}
        gestureHandling="greedy"
        mapId="nagar-issue-map"
      >
        {issues.map((issue) => {
          if (!issue.location?.lat) return null
          const color = severityColor(issue.dna?.severityScore)
          return (
            <AdvancedMarker
              key={issue.id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              onClick={() => setSelected(issue)}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer"
                style={{ backgroundColor: MARKER_COLORS[color] }}
              />
            </AdvancedMarker>
          )
        })}

        {selected && (
          <InfoWindow
            position={{ lat: selected.location.lat, lng: selected.location.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-1 max-w-xs space-y-1">
              <p className="font-semibold text-sm">
                {selected.dna?.classification ?? 'Issue'}
              </p>
              <p className="text-xs text-slate-600 line-clamp-2">{selected.rawDescription}</p>
              {selected.dna && (
                <p className="text-xs">Severity: {selected.dna.severityScore}/10</p>
              )}
              <Link
                href={`/issue/${selected.id}`}
                className="text-xs text-blue-600 underline block mt-1"
              >
                View details →
              </Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
