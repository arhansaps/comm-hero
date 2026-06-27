'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { DNAPanel } from './DNAPanel'
import { Card, CardContent } from '@/components/ui/card'
import type { IssueDNA } from '@/types'

export function DNALivePanel({ issueId, initialDna }: { issueId: string; initialDna: IssueDNA | null }) {
  const [dna, setDna] = useState<IssueDNA | null>(initialDna)

  useEffect(() => {
    if (dna) return // already have it, no need to subscribe
    const unsub = onSnapshot(doc(db, 'issues', issueId), (snap) => {
      const d = snap.data()?.dna ?? null
      if (d) setDna(d)
    })
    return unsub
  }, [issueId, dna])

  if (dna) return <DNAPanel dna={dna} />

  return (
    <Card>
      <CardContent className="py-6 text-center text-slate-500 text-sm space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="animate-spin text-lg">⟳</span>
          <span>AI is analysing your report…</span>
        </div>
        <p className="text-xs text-slate-400">This usually takes 10–20 seconds</p>
      </CardContent>
    </Card>
  )
}
