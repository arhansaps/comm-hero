'use client'

import { useEffect, useState } from 'react'
import { subscribeToIssues } from '@/lib/firebase/issues'
import { IssueCard } from '@/components/issue/IssueCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Issue } from '@/types'

export default function DashboardPage() {
  const [issues, setIssues] = useState<Issue[] | null>(null)

  useEffect(() => {
    const unsub = subscribeToIssues(setIssues)
    return unsub
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Community Issues</h1>
        <Link href="/report">
          <Button>+ Report Issue</Button>
        </Link>
      </div>

      {issues === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg">No issues reported yet.</p>
          <p className="text-sm mt-1">Be the first to report one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}
