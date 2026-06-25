'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/AuthProvider'
import { createIssue } from '@/lib/firebase/issues'
import { uploadIssueMedia } from '@/lib/firebase/storage'
import { db } from '@/lib/firebase/client'
import { StepMedia } from './StepMedia'
import { StepLocation } from './StepLocation'
import { StepDescription } from './StepDescription'
import { Progress } from '@/components/ui/progress'
import type { IssueLocation } from '@/types'

export function ReportStepper() {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [location, setLocation] = useState<Partial<IssueLocation> | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const stepLabels = ['Media', 'Location', 'Description']

  async function handleSubmit() {
    if (!user || !location?.lat) return
    if (files.length === 0) {
      toast.error('Please upload at least one photo')
      return
    }
    setLoading(true)
    try {
      // Create a placeholder issue to get an ID for storage path
      const issueId = await createIssue({
        reportedBy: user.uid,
        channel: 'app',
        location: location as IssueLocation,
        media: [],
        rawDescription: description,
      })

      // Upload media files using the issue ID
      const mediaUrls = await Promise.all(
        files.map((f) => uploadIssueMedia(f, issueId))
      )

      // Update the issue doc with the uploaded media URLs
      await updateDoc(doc(db, 'issues', issueId), { media: mediaUrls })

      toast.success('Issue reported! AI is analyzing your report…')
      router.push(`/issue/${issueId}`)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          {stepLabels.map((label, i) => (
            <span key={label} className={i + 1 === step ? 'font-semibold text-slate-900' : ''}>{label}</span>
          ))}
        </div>
        <Progress value={(step / 3) * 100} />
      </div>

      {step === 1 && (
        <StepMedia files={files} onChange={setFiles} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepLocation
          location={location}
          onChange={setLocation}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepDescription
          description={description}
          onChange={setDescription}
          onSubmit={handleSubmit}
          onBack={() => setStep(2)}
          loading={loading}
        />
      )}
    </div>
  )
}
