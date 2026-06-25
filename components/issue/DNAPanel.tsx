import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { IssueDNA, severityColor, SEVERITY_TAILWIND } from '@/types'

const TRAJECTORY_STYLES: Record<IssueDNA['severityTrajectory'], string> = {
  stable: 'bg-green-100 text-green-800',
  worsening: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

interface DNAPanelProps {
  dna: IssueDNA
}

export function DNAPanel({ dna }: DNAPanelProps) {
  const color = severityColor(dna.severityScore)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Issue DNA</span>
          <Badge variant="outline" className="text-xs">
            {Math.round(dna.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${SEVERITY_TAILWIND[color]}`} />
          <div>
            <p className="font-semibold">{dna.classification}</p>
            <p className="text-sm text-slate-500">{dna.subcategory}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold">{dna.severityScore}<span className="text-sm font-normal text-slate-400">/10</span></p>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Root Cause Hypothesis</p>
          <p className="text-sm text-slate-700">{dna.rootCauseHypothesis}</p>
        </div>

        <div className="flex items-start gap-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Trajectory</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${TRAJECTORY_STYLES[dna.severityTrajectory]}`}>
              {dna.severityTrajectory}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-5">{dna.trajectoryReason}</p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-0.5">Department</p>
            <p>{dna.department.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-0.5">Est. Resolution</p>
            <p>{dna.resolutionETA ? new Date(dna.resolutionETA).toLocaleDateString('en-IN') : 'Unknown'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
