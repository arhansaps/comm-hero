'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { auth } from '@/lib/firebase/client'
import { signOut } from 'firebase/auth'
import { Button } from '@/components/ui/button'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="font-bold text-lg text-slate-900">
          NAGAR
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/report">
            <Button size="sm">Report Issue</Button>
          </Link>
          <Link href="/map">
            <Button size="sm" variant="outline">Map</Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => signOut(auth)}
          >
            Sign out
          </Button>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
