import { getIssue } from '@/lib/firebase/issues'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { DNALivePanel } from '@/components/issue/DNALivePanel'
import { StatusTimeline } from '@/components/issue/StatusTimeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: { id: string }
}

export default async function IssueDetailPage({ params }: Props) {
  const issue = await getIssue(params.id)
  if (!issue) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {issue.dna?.classification ?? 'Issue Report'}
          </h1>
          <Badge variant="outline">{issue.status}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          {issue.location.wardName} · Reported via {issue.channel}
        </p>
      </div>

      {issue.media.length > 0 && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
          <Image
            src={issue.media[0]}
            alt="Issue photo"
            fill
            className="object-cover"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">{issue.rawDescription}</p>
        </CardContent>
      </Card>

      <DNALivePanel issueId={params.id} initialDna={issue.dna ?? null} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline currentStatus={issue.status} />
        </CardContent>
      </Card>
    </div>
  )
}
