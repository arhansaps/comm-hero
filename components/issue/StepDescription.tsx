'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface StepDescriptionProps {
  description: string
  onChange: (val: string) => void
  onSubmit: () => void
  onBack: () => void
  loading: boolean
}

export function StepDescription({ description, onChange, onSubmit, onBack, loading }: StepDescriptionProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Briefly describe the issue. The AI will handle classification — just tell us what you see.
      </p>
      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          placeholder="e.g. Large pothole outside Gate 4 of the park, there since last week's rain"
          value={description}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>Back</Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={description.trim().length < 10 || loading}
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </Button>
      </div>
    </div>
  )
}
