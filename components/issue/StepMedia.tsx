'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface StepMediaProps {
  files: File[]
  onChange: (files: File[]) => void
  onNext: () => void
}

export function StepMedia({ files, onChange, onNext }: StepMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    // Revoke previous object URLs to prevent memory leaks
    previews.forEach((url) => URL.revokeObjectURL(url))
    onChange(arr)
    setPreviews(arr.map((f) => URL.createObjectURL(f)))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Upload a photo or video of the issue. Clear images help AI classify it accurately.
      </p>
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {previews.length === 0 ? (
          <p className="text-slate-500">Tap to select photo / video</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded overflow-hidden">
                <Image src={src} alt="preview" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        className="w-full"
        onClick={onNext}
        disabled={files.length === 0}
      >
        Next: Pin Location
      </Button>
    </div>
  )
}
