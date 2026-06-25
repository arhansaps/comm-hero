import { Issue } from '@/types'

const STATUSES: Issue['status'][] = ['pending', 'validated', 'assigned', 'in_progress', 'resolved']

const STATUS_LABELS: Record<Issue['status'], string> = {
  pending: 'Reported',
  validated: 'Validated by Community',
  assigned: 'Assigned to Department',
  in_progress: 'Work In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

interface StatusTimelineProps {
  currentStatus: Issue['status']
}

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = STATUSES.indexOf(currentStatus)

  return (
    <div className="space-y-2">
      {STATUSES.map((s, i) => {
        const done = i <= currentIndex
        const active = i === currentIndex
        return (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              done ? 'bg-blue-500' : 'bg-slate-200'
            } ${active ? 'ring-2 ring-blue-300' : ''}`} />
            <span className={`text-sm ${done ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {STATUS_LABELS[s]}
            </span>
          </div>
        )
      })}
      {currentStatus === 'escalated' && (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-300" />
          <span className="text-sm text-orange-700 font-medium">Escalated to senior officer</span>
        </div>
      )}
    </div>
  )
}
