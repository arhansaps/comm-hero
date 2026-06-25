import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Issue, severityColor, SEVERITY_TAILWIND } from '@/types'

const STATUS_LABELS: Record<Issue['status'], string> = {
  pending: 'Pending',
  validated: 'Validated',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

interface IssueCardProps {
  issue: Issue
}

export function IssueCard({ issue }: IssueCardProps) {
  const color = severityColor(issue.dna?.severityScore)
  const dotClass = `w-3 h-3 rounded-full ${SEVERITY_TAILWIND[color]}`

  return (
    <Link href={`/issue/${issue.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={dotClass} />
              <span className="font-semibold text-sm">
                {issue.dna?.classification ?? 'Analyzing…'}
              </span>
            </div>
            <Badge variant="outline">{STATUS_LABELS[issue.status]}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 line-clamp-2">{issue.rawDescription}</p>
          {issue.dna && (
            <p className="text-xs text-slate-400 mt-2">
              Severity: {issue.dna.severityScore}/10 · {issue.dna.department.name}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {issue.location.wardName} · {issue.location.address}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
