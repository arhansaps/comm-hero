# NAGAR Phase 1 — Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working web app where a citizen can file a civic issue with a photo, see it on a map with an AI-generated severity score.

**Architecture:** Next.js 14 App Router frontend with Firebase backend. Issues are written to Firestore; a Cloud Function `onCreate` trigger calls Gemini 2.0 Flash to compute a DNA classification + severity score and writes the result back to the issue doc. The frontend renders issues on Google Maps with pins color-coded by severity.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Firebase v10 (Auth/Firestore/Storage/Hosting), Firebase Admin SDK, Firebase Cloud Functions (Node 20), Gemini 2.0 Flash (`@google/generative-ai`), Google Maps JS API (`@vis.gl/react-google-maps`), Zustand

## Global Constraints

- Node.js ≥ 20; Next.js 14 (App Router only — never Pages Router)
- TypeScript strict mode; all files `.ts` / `.tsx`
- Tailwind CSS for all styling — no inline `style=` attributes
- shadcn/ui for all UI primitives (Button, Card, Badge, Input, Label, Textarea, Progress, Toast)
- Firebase SDK v10+; Firebase Admin SDK v12+
- Gemini model ID: `gemini-2.0-flash`
- All Firestore writes use typed interfaces from `types/index.ts`
- Phone auth targets India format (+91) but accepts any E.164 number
- Cloud Functions runtime: Node.js 20

---

## File Map

| Path | Purpose |
|---|---|
| `types/index.ts` | All shared TypeScript interfaces (Issue, Cluster, User, etc.) |
| `lib/firebase/client.ts` | Firebase client SDK init (singleton) |
| `lib/firebase/admin.ts` | Firebase Admin SDK init (server-side singleton) |
| `lib/firebase/issues.ts` | Typed Firestore CRUD for issues |
| `lib/gemini/dna-engine.ts` | Gemini call: image + description → partial DNA JSON |
| `lib/firebase/storage.ts` | Upload helper for Firebase Storage |
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Root page — redirects to `/dashboard` or `/login` |
| `app/(auth)/login/page.tsx` | Phone OTP login page |
| `components/auth/AuthProvider.tsx` | Firebase Auth context + hook |
| `app/(main)/layout.tsx` | Protected layout (redirects unauthenticated to `/login`) |
| `app/(main)/dashboard/page.tsx` | Citizen home — real-time issue feed |
| `app/(main)/report/page.tsx` | 3-step issue submission flow |
| `app/(main)/issue/[id]/page.tsx` | Issue detail + DNA panel + status timeline |
| `app/(main)/map/page.tsx` | Google Maps fullscreen with issue pins |
| `components/issue/ReportStepper.tsx` | 3-step wizard orchestrator |
| `components/issue/StepMedia.tsx` | Step 1: photo/video upload |
| `components/issue/StepLocation.tsx` | Step 2: map pin placement |
| `components/issue/StepDescription.tsx` | Step 3: text description + submit |
| `components/issue/IssueCard.tsx` | Issue summary card for dashboard feed |
| `components/issue/DNAPanel.tsx` | Displays DNA Engine output |
| `components/issue/StatusTimeline.tsx` | Visual issue status history |
| `components/map/IssueMap.tsx` | Google Maps with severity-colored pins |
| `functions/src/index.ts` | Cloud Function exports |
| `functions/src/agents/dna-trigger.ts` | Firestore `onCreate` → run DNA Engine → write back |
| `functions/package.json` | Functions dependencies |
| `.env.local` | All environment variables (never committed) |
| `next.config.ts` | Next.js config (image domains, etc.) |

---

## Task 1: Project Scaffold + Dependencies

**Files:**
- Create: entire Next.js project in `d:/proj/comm_hero/`
- Create: `functions/` folder with its own `package.json`
- Create: `.env.local`
- Modify: `next.config.ts`
- Create: `tailwind.config.ts`

**Interfaces:**
- Produces: working `npm run dev` with Tailwind + shadcn

- [ ] **Step 1: Scaffold Next.js app in current directory**

```bash
cd d:/proj/comm_hero
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js project files created (app/, public/, package.json, etc.)

- [ ] **Step 2: Install all runtime dependencies**

```bash
npm install firebase firebase-admin @google/generative-ai \
  @vis.gl/react-google-maps \
  geofire-common \
  zustand \
  jspdf \
  qrcode
npm install -D @types/qrcode firebase-tools
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

When prompted, accept defaults (New York style, CSS variables).

- [ ] **Step 4: Add shadcn components we need**

```bash
npx shadcn@latest add button card badge input label textarea progress sheet dialog toast tabs separator avatar skeleton
```

- [ ] **Step 5: Scaffold Cloud Functions folder**

```bash
mkdir functions
cd functions
npm init -y
npm install firebase-admin firebase-functions @google/generative-ai
npm install -D typescript @types/node
cd ..
```

Create `functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017"
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 6: Create `.env.local` with placeholder values**

```env
# Firebase (client-side — NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Firebase Admin (server-side — no NEXT_PUBLIC_ prefix)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Google AI Studio
GEMINI_API_KEY=your-gemini-api-key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
```

- [ ] **Step 7: Update `next.config.ts` for Firebase Storage image domains**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: `Ready on http://localhost:3000` with no TypeScript errors.

- [ ] **Step 9: Commit scaffold**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 14 project with Firebase + shadcn/ui"
```

---

## Task 2: TypeScript Type Definitions

**Files:**
- Create: `types/index.ts`

**Interfaces:**
- Produces: `Issue`, `Cluster`, `Validation`, `User`, `EscalationDraft`, `IssueDNA`, `IssueLocation`, `IssueDepartment` — used by every other task

- [ ] **Step 1: Create `types/index.ts` with all shared interfaces**

```typescript
import { Timestamp } from 'firebase/firestore'

export interface IssueDepartment {
  name: string
  zoneId: string
  contactEmail: string
}

export interface IssueDNA {
  classification: string
  subcategory: string
  rootCauseHypothesis: string
  clusterId: string | null
  severityScore: number        // 1–10
  severityTrajectory: 'stable' | 'worsening' | 'critical'
  trajectoryReason: string
  department: IssueDepartment
  resolutionETA: string | null // ISO date string
  confidence: number           // 0–1
}

export interface IssueLocation {
  lat: number
  lng: number
  geohash: string
  address: string
  wardId: string
  wardName: string
}

export interface Issue {
  id: string
  reportedBy: string
  channel: 'app' | 'whatsapp' | 'voice' | 'qr'
  location: IssueLocation
  media: string[]
  rawDescription: string
  dna: IssueDNA | null
  status: 'pending' | 'validated' | 'assigned' | 'in_progress' | 'resolved' | 'escalated'
  validationCount: number
  escalationLevel: 0 | 1 | 2 | 3 | 4
  lastEscalationAt: Timestamp | null
  resolvedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Cluster {
  id: string
  issueIds: string[]
  centroid: { lat: number; lng: number; geohash: string }
  classification: string
  inferredRootCause: string
  wardId: string
  severityScore: number
  status: 'open' | 'resolved'
  createdAt: Timestamp
}

export interface Validation {
  userId: string
  response: 'confirmed_bad' | 'confirmed_minor' | 'denied' | 'worse'
  createdAt: Timestamp
}

export interface User {
  id: string
  phone: string
  name: string
  wardId: string
  geohash: string
  trustScore: number
  fcmToken: string
  preferredLanguage: string
  createdAt: Timestamp
}

export interface EscalationDraft {
  level: 1 | 2 | 3 | 4
  type: 'follow_up' | 'senior_escalation' | 'rti' | 'social_pack'
  content: string
  status: 'pending_approval' | 'approved' | 'sent' | 'dismissed'
  generatedAt: Timestamp
  sentAt: Timestamp | null
}

export type SeverityColor = 'green' | 'yellow' | 'orange' | 'red'

export function severityColor(score: number | undefined): SeverityColor {
  if (!score) return 'green'
  if (score <= 3) return 'green'
  if (score <= 5) return 'yellow'
  if (score <= 7) return 'orange'
  return 'red'
}

export const SEVERITY_TAILWIND: Record<SeverityColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-600',
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit types**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript interfaces for Issue, User, DNA, Cluster"
```

---

## Task 3: Firebase SDK Setup

**Files:**
- Create: `lib/firebase/client.ts`
- Create: `lib/firebase/admin.ts`
- Create: `lib/firebase/issues.ts`
- Create: `lib/firebase/storage.ts`

**Interfaces:**
- Produces: `db` (Firestore), `auth` (Firebase Auth), `storage` (Storage) from `lib/firebase/client.ts`; `adminDb` from `lib/firebase/admin.ts`; `createIssue`, `getIssue`, `listIssues`, `subscribeToIssues` from `lib/firebase/issues.ts`; `uploadIssueMedia` from `lib/firebase/storage.ts`

- [ ] **Step 1: Create Firebase client SDK init**

```typescript
// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
```

- [ ] **Step 2: Create Firebase Admin SDK init**

```typescript
// lib/firebase/admin.ts
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminDb = getFirestore()
```

- [ ] **Step 3: Create Firestore issue CRUD helpers**

```typescript
// lib/firebase/issues.ts
import {
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './client'
import type { Issue } from '@/types'

const ISSUES_COLLECTION = 'issues'

export type CreateIssueInput = Pick<
  Issue,
  'reportedBy' | 'channel' | 'location' | 'media' | 'rawDescription'
>

export async function createIssue(input: CreateIssueInput): Promise<string> {
  const ref = await addDoc(collection(db, ISSUES_COLLECTION), {
    ...input,
    dna: null,
    status: 'pending',
    validationCount: 0,
    escalationLevel: 0,
    lastEscalationAt: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getIssue(id: string): Promise<Issue | null> {
  const snap = await getDoc(doc(db, ISSUES_COLLECTION, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Issue
}

export function subscribeToIssues(
  onNext: (issues: Issue[]) => void,
  maxResults = 50
): Unsubscribe {
  const q = query(
    collection(db, ISSUES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  )
  return onSnapshot(q, (snap) => {
    const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Issue))
    onNext(issues)
  })
}
```

- [ ] **Step 4: Create Firebase Storage upload helper**

```typescript
// lib/firebase/storage.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './client'

export async function uploadIssueMedia(
  file: File,
  issueId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `issues/${issueId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit Firebase setup**

```bash
git add lib/
git commit -m "feat: add Firebase client, admin SDK, issue CRUD, and storage helpers"
```

---

## Task 4: Authentication — Phone OTP Login

**Files:**
- Create: `components/auth/AuthProvider.tsx`
- Create: `app/(auth)/login/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `useAuth()` hook returning `{ user: User | null, loading: boolean }`; `AuthProvider` component wrapping app

- [ ] **Step 1: Create AuthProvider with context**

```typescript
// components/auth/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Wrap root layout with AuthProvider**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NAGAR — Neighborhood Agentic Guardian',
  description: 'Civic issue reporting with AI resolution advocacy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create phone OTP login page**

```typescript
// app/(auth)/login/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [phone, setPhone] = useState('+91')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  async function sendOTP() {
    setLoading(true)
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        })
      }
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current
      )
      setStep('otp')
      toast({ title: 'OTP sent', description: `Code sent to ${phone}` })
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP() {
    if (!confirmationRef.current) return
    setLoading(true)
    try {
      await confirmationRef.current.confirm(otp)
      router.push('/dashboard')
    } catch (err) {
      toast({ title: 'Invalid OTP', description: String(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">NAGAR</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? 'Enter your mobile number to get started'
              : `Enter the 6-digit code sent to ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button onClick={sendOTP} disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send OTP'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <Button onClick={verifyOTP} disabled={loading || otp.length < 6} className="w-full">
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                Change number
              </Button>
            </>
          )}
          <div id="recaptcha-container" />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create root redirect page**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 5: Create protected main layout**

```typescript
// app/(main)/layout.tsx
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
```

- [ ] **Step 6: Manually test auth flow**

```bash
npm run dev
```

1. Navigate to `http://localhost:3000` — should redirect to `/dashboard` then to `/login` (unauthenticated).
2. Enter a real phone number, complete reCAPTCHA, enter OTP.
3. Should redirect to `/dashboard` (empty page for now).
4. Refresh — should stay on `/dashboard` without re-login prompt.

- [ ] **Step 7: Commit auth**

```bash
git add app/ components/auth/
git commit -m "feat: phone OTP authentication with Firebase Auth, protected main layout"
```

---

## Task 5: Report Stepper — 3-Step Issue Submission

**Files:**
- Create: `components/issue/ReportStepper.tsx`
- Create: `components/issue/StepMedia.tsx`
- Create: `components/issue/StepLocation.tsx`
- Create: `components/issue/StepDescription.tsx`
- Create: `app/(main)/report/page.tsx`

**Interfaces:**
- Consumes: `uploadIssueMedia(file, issueId)` from `lib/firebase/storage.ts`; `createIssue(input)` from `lib/firebase/issues.ts`; `useAuth()` hook
- Produces: Submitted issue written to Firestore with `media`, `location`, `rawDescription` fields populated; redirects to `/issue/[id]` on success

- [ ] **Step 1: Create StepMedia component (photo/video upload)**

```typescript
// components/issue/StepMedia.tsx
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
```

- [ ] **Step 2: Create StepLocation component (Google Maps pin)**

```typescript
// components/issue/StepLocation.tsx
'use client'

import { useState } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { Button } from '@/components/ui/button'
import type { IssueLocation } from '@/types'

interface StepLocationProps {
  location: Partial<IssueLocation> | null
  onChange: (location: Partial<IssueLocation>) => void
  onNext: () => void
  onBack: () => void
}

function MapPicker({
  onChange,
}: {
  onChange: (loc: Partial<IssueLocation>) => void
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null)

  function handleClick(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarker({ lat, lng })
    onChange({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, wardId: 'demo-ward', wardName: 'Demo Ward', geohash: '' })
  }

  return (
    <Map
      style={{ width: '100%', height: '300px', borderRadius: '8px' }}
      defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
      defaultZoom={14}
      gestureHandling="greedy"
      disableDefaultUI
      onClick={handleClick}
      mapId="issue-location-picker"
    >
      {marker && <AdvancedMarker position={marker} />}
    </Map>
  )
}

export function StepLocation({ location, onChange, onNext, onBack }: StepLocationProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Tap the map to pin the exact location of the issue.</p>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <MapPicker onChange={onChange} />
      </APIProvider>
      {location?.lat && (
        <p className="text-xs text-slate-500">
          Pinned: {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext} disabled={!location?.lat}>
          Next: Describe Issue
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create StepDescription component (text + submit)**

```typescript
// components/issue/StepDescription.tsx
'use client'

import { useState } from 'react'
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
```

- [ ] **Step 4: Create ReportStepper orchestrator**

```typescript
// components/issue/ReportStepper.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createIssue } from '@/lib/firebase/issues'
import { uploadIssueMedia } from '@/lib/firebase/storage'
import { StepMedia } from './StepMedia'
import { StepLocation } from './StepLocation'
import { StepDescription } from './StepDescription'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { IssueLocation } from '@/types'

export function ReportStepper() {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<File[]>([])
  const [location, setLocation] = useState<Partial<IssueLocation> | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const stepLabels = ['Media', 'Location', 'Description']

  async function handleSubmit() {
    if (!user || !location?.lat) return
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

      // We update via a second write — for Phase 1 this is acceptable
      // (Phase 2 Cloud Function reads from the issue doc, not a separate call)
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase/client')
      await updateDoc(doc(db, 'issues', issueId), { media: mediaUrls })

      toast({ title: 'Issue reported!', description: 'AI is analyzing your report…' })
      router.push(`/issue/${issueId}`)
    } catch (err) {
      toast({ title: 'Error submitting', description: String(err), variant: 'destructive' })
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
```

- [ ] **Step 5: Create report page**

```typescript
// app/(main)/report/page.tsx
import { ReportStepper } from '@/components/issue/ReportStepper'

export default function ReportPage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Report an Issue</h1>
      <ReportStepper />
    </div>
  )
}
```

- [ ] **Step 6: Test report flow manually**

```bash
npm run dev
```

1. Log in, click "Report Issue".
2. Upload a photo — "Next: Pin Location" becomes enabled.
3. Tap a location on the map — "Next: Describe Issue" becomes enabled.
4. Enter 10+ characters — "Submit Report" becomes enabled.
5. Submit — verify a doc appears in Firestore console under `issues/` with `media`, `location`, `rawDescription`, `status: "pending"`, `dna: null`.
6. Should redirect to `/issue/[id]` (empty page for now).

- [ ] **Step 7: Commit report flow**

```bash
git add app/(main)/report/ components/issue/ReportStepper.tsx components/issue/StepMedia.tsx components/issue/StepLocation.tsx components/issue/StepDescription.tsx
git commit -m "feat: 3-step report stepper with media upload, map pin, and description"
```

---

## Task 6: Basic DNA Engine (Gemini Integration)

**Files:**
- Create: `lib/gemini/dna-engine.ts`

**Interfaces:**
- Consumes: `GEMINI_API_KEY` env var; image as base64 or URL; description string
- Produces: `runDNAEngine(params: DNAEngineInput): Promise<IssueDNA>` — partial DNA (Phase 1 skips clustering, ward-level department routing)

- [ ] **Step 1: Create DNA Engine with Gemini structured output**

```typescript
// lib/gemini/dna-engine.ts
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { IssueDNA } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface DNAEngineInput {
  imageBase64: string      // base64-encoded image bytes
  mimeType: string         // e.g. 'image/jpeg'
  description: string
  wardName?: string
}

const DNA_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    classification: { type: SchemaType.STRING },
    subcategory: { type: SchemaType.STRING },
    rootCauseHypothesis: { type: SchemaType.STRING },
    severityScore: { type: SchemaType.NUMBER },
    severityTrajectory: {
      type: SchemaType.STRING,
      enum: ['stable', 'worsening', 'critical'],
    },
    trajectoryReason: { type: SchemaType.STRING },
    departmentName: { type: SchemaType.STRING },
    resolutionETA: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
  },
  required: [
    'classification',
    'subcategory',
    'rootCauseHypothesis',
    'severityScore',
    'severityTrajectory',
    'trajectoryReason',
    'departmentName',
    'confidence',
  ],
}

export async function runDNAEngine(input: DNAEngineInput): Promise<IssueDNA> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: DNA_RESPONSE_SCHEMA,
    },
  })

  const prompt = `You are a civic infrastructure expert analyzing a reported issue.

Issue description: "${input.description}"
Ward: ${input.wardName ?? 'Unknown'}

Analyze the image and description. Return a structured assessment.

- classification: type of civic issue (e.g. "Pothole", "Water Leakage", "Broken Streetlight", "Garbage Dump", "Open Drain")
- subcategory: more specific sub-type (e.g. "Road pothole", "Pipe burst", "Missing manhole cover")
- rootCauseHypothesis: concise root cause (1–2 sentences, e.g. "Likely drainage failure from adjacent construction site")
- severityScore: integer 1–10 (1=cosmetic, 10=immediate hazard)
- severityTrajectory: "stable" | "worsening" | "critical"
- trajectoryReason: why it will stay stable or worsen (1 sentence)
- departmentName: which municipal department should handle this (e.g. "Roads & Infrastructure", "Water Supply Board", "Street Lighting Dept")
- resolutionETA: expected resolution date as ISO string based on typical municipal timelines, or null if unknown
- confidence: 0.0–1.0 confidence in your assessment`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: input.mimeType,
        data: input.imageBase64,
      },
    },
  ])

  const raw = JSON.parse(result.response.text())

  return {
    classification: raw.classification,
    subcategory: raw.subcategory,
    rootCauseHypothesis: raw.rootCauseHypothesis,
    clusterId: null,
    severityScore: Math.min(10, Math.max(1, Math.round(raw.severityScore))),
    severityTrajectory: raw.severityTrajectory,
    trajectoryReason: raw.trajectoryReason,
    department: {
      name: raw.departmentName,
      zoneId: 'zone-1',
      contactEmail: 'contact@municipality.gov.in',
    },
    resolutionETA: raw.resolutionETA ?? null,
    confidence: raw.confidence,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit DNA engine**

```bash
git add lib/gemini/
git commit -m "feat: basic DNA Engine using Gemini 2.0 Flash structured output"
```

---

## Task 7: Cloud Function — DNA Trigger on Issue Create

**Files:**
- Create: `functions/src/agents/dna-trigger.ts`
- Create: `functions/src/index.ts`

**Interfaces:**
- Consumes: `runDNAEngine()` from a local copy of the engine adapted for Node; Firestore Admin SDK
- Produces: Cloud Function `onIssueCreated` that reads the newly created issue, fetches image from Storage, calls DNA Engine, writes `dna` field back to Firestore

- [ ] **Step 1: Create DNA trigger Cloud Function**

```typescript
// functions/src/agents/dna-trigger.ts
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import * as https from 'https'

admin.initializeApp()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        const contentType = res.headers['content-type'] ?? 'image/jpeg'
        resolve({ base64: buf.toString('base64'), mimeType: contentType })
      })
      res.on('error', reject)
    })
  })
}

const DNA_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    classification: { type: SchemaType.STRING },
    subcategory: { type: SchemaType.STRING },
    rootCauseHypothesis: { type: SchemaType.STRING },
    severityScore: { type: SchemaType.NUMBER },
    severityTrajectory: { type: SchemaType.STRING, enum: ['stable', 'worsening', 'critical'] },
    trajectoryReason: { type: SchemaType.STRING },
    departmentName: { type: SchemaType.STRING },
    resolutionETA: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ['classification', 'subcategory', 'rootCauseHypothesis', 'severityScore', 'severityTrajectory', 'trajectoryReason', 'departmentName', 'confidence'],
}

export const onIssueCreated = functions.firestore
  .document('issues/{issueId}')
  .onCreate(async (snap, context) => {
    const issue = snap.data()
    const issueId = context.params.issueId

    if (!issue.media || issue.media.length === 0 || !issue.rawDescription) {
      functions.logger.info(`Issue ${issueId} has no media — skipping DNA`)
      return
    }

    try {
      const { base64, mimeType } = await fetchImageAsBase64(issue.media[0])

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: DNA_SCHEMA,
        },
      })

      const prompt = `You are a civic infrastructure expert. Analyze this reported issue.

Description: "${issue.rawDescription}"
Ward: ${issue.location?.wardName ?? 'Unknown'}

Return classification, root cause, severity (1–10), trajectory, department, resolution ETA, and confidence.`

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64 } },
      ])

      const raw = JSON.parse(result.response.text())

      const dna = {
        classification: raw.classification,
        subcategory: raw.subcategory,
        rootCauseHypothesis: raw.rootCauseHypothesis,
        clusterId: null,
        severityScore: Math.min(10, Math.max(1, Math.round(raw.severityScore))),
        severityTrajectory: raw.severityTrajectory,
        trajectoryReason: raw.trajectoryReason,
        department: {
          name: raw.departmentName,
          zoneId: 'zone-1',
          contactEmail: 'contact@municipality.gov.in',
        },
        resolutionETA: raw.resolutionETA ?? null,
        confidence: raw.confidence,
      }

      await admin.firestore().doc(`issues/${issueId}`).update({
        dna,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      functions.logger.info(`DNA written for issue ${issueId}: ${dna.classification} severity=${dna.severityScore}`)
    } catch (err) {
      functions.logger.error(`DNA Engine failed for issue ${issueId}`, err)
    }
  })
```

- [ ] **Step 2: Create functions entry point**

```typescript
// functions/src/index.ts
export { onIssueCreated } from './agents/dna-trigger'
```

- [ ] **Step 3: Set GEMINI_API_KEY in Cloud Functions config**

```bash
cd functions
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

For local emulator, create `functions/.env`:
```
GEMINI_API_KEY=your-gemini-api-key
```

- [ ] **Step 4: Build and deploy functions**

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

Expected: `✔  functions[onIssueCreated]: Successful` in output.

- [ ] **Step 5: End-to-end test**

1. Submit a new issue via the app with a real photo.
2. Open Firebase console → Firestore → `issues/[id]`.
3. Within ~15 seconds, the `dna` field should populate with classification, severityScore, etc.

- [ ] **Step 6: Commit Cloud Function**

```bash
git add functions/
git commit -m "feat: Cloud Function triggers DNA Engine on issue creation, writes dna field back"
```

---

## Task 8: Dashboard — Real-time Issue Feed

**Files:**
- Create: `components/issue/IssueCard.tsx`
- Create: `app/(main)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `subscribeToIssues(onNext)` from `lib/firebase/issues.ts`; `Issue` type; `severityColor()`, `SEVERITY_TAILWIND` from `types/index.ts`
- Produces: Live-updating grid of `IssueCard` components on the dashboard

- [ ] **Step 1: Create IssueCard component**

```typescript
// components/issue/IssueCard.tsx
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
```

- [ ] **Step 2: Create dashboard page with real-time subscription**

```typescript
// app/(main)/dashboard/page.tsx
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
```

- [ ] **Step 3: Test dashboard**

1. `npm run dev` → navigate to `/dashboard`.
2. Submit a new issue via `/report`.
3. Dashboard should update live (no page refresh) with the new issue card.
4. Card should initially show "Analyzing…" then update to show classification after ~15s when Cloud Function writes `dna`.

- [ ] **Step 4: Commit dashboard**

```bash
git add app/(main)/dashboard/ components/issue/IssueCard.tsx
git commit -m "feat: real-time issue feed dashboard with IssueCard components"
```

---

## Task 9: Issue Detail Page + DNA Panel + Status Timeline

**Files:**
- Create: `components/issue/DNAPanel.tsx`
- Create: `components/issue/StatusTimeline.tsx`
- Create: `app/(main)/issue/[id]/page.tsx`

**Interfaces:**
- Consumes: `getIssue(id)` from `lib/firebase/issues.ts`; `Issue`, `IssueDNA` types; `severityColor()`, `SEVERITY_TAILWIND` from `types/index.ts`
- Produces: Full detail view showing photo, DNA panel, status timeline

- [ ] **Step 1: Create DNAPanel component**

```typescript
// components/issue/DNAPanel.tsx
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
```

- [ ] **Step 2: Create StatusTimeline component**

```typescript
// components/issue/StatusTimeline.tsx
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
```

- [ ] **Step 3: Create issue detail page**

```typescript
// app/(main)/issue/[id]/page.tsx
import { getIssue } from '@/lib/firebase/issues'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { DNAPanel } from '@/components/issue/DNAPanel'
import { StatusTimeline } from '@/components/issue/StatusTimeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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

      {issue.dna ? (
        <DNAPanel dna={issue.dna} />
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-slate-500 text-sm">
            AI analysis in progress… Check back in a few seconds.
          </CardContent>
        </Card>
      )}

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
```

- [ ] **Step 4: Test issue detail**

1. Submit an issue, wait for DNA Cloud Function to run (~15s).
2. Navigate to the issue detail page.
3. Verify: photo displayed, DNA Panel shows classification/severity/department, Status Timeline shows "Reported" as active step.

- [ ] **Step 5: Commit issue detail**

```bash
git add app/(main)/issue/ components/issue/DNAPanel.tsx components/issue/StatusTimeline.tsx
git commit -m "feat: issue detail page with DNA Panel and status timeline"
```

---

## Task 10: Map View — Severity-colored Issue Pins

**Files:**
- Create: `components/map/IssueMap.tsx`
- Create: `app/(main)/map/page.tsx`

**Interfaces:**
- Consumes: `subscribeToIssues(onNext)` from `lib/firebase/issues.ts`; `Issue` type; `severityColor()` from `types/index.ts`; Google Maps API via `@vis.gl/react-google-maps`
- Produces: Fullscreen map page with issue pins color-coded by severity; clicking a pin opens issue detail

- [ ] **Step 1: Create IssueMap component**

```typescript
// components/map/IssueMap.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps'
import { subscribeToIssues } from '@/lib/firebase/issues'
import { Issue, severityColor } from '@/types'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const MARKER_COLORS: Record<string, string> = {
  green: '#22c55e',
  yellow: '#facc15',
  orange: '#f97316',
  red: '#dc2626',
}

export function IssueMap() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [selected, setSelected] = useState<Issue | null>(null)

  useEffect(() => {
    return subscribeToIssues(setIssues, 200)
  }, [])

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Map
        style={{ width: '100%', height: '100%' }}
        defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
        defaultZoom={13}
        gestureHandling="greedy"
        mapId="nagar-issue-map"
      >
        {issues.map((issue) => {
          if (!issue.location?.lat) return null
          const color = severityColor(issue.dna?.severityScore)
          return (
            <AdvancedMarker
              key={issue.id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              onClick={() => setSelected(issue)}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer"
                style={{ backgroundColor: MARKER_COLORS[color] }}
              />
            </AdvancedMarker>
          )
        })}

        {selected && (
          <InfoWindow
            position={{ lat: selected.location.lat, lng: selected.location.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-1 max-w-xs space-y-1">
              <p className="font-semibold text-sm">
                {selected.dna?.classification ?? 'Issue'}
              </p>
              <p className="text-xs text-slate-600 line-clamp-2">{selected.rawDescription}</p>
              {selected.dna && (
                <p className="text-xs">Severity: {selected.dna.severityScore}/10</p>
              )}
              <Link
                href={`/issue/${selected.id}`}
                className="text-xs text-blue-600 underline block mt-1"
              >
                View details →
              </Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
```

- [ ] **Step 2: Create fullscreen map page**

```typescript
// app/(main)/map/page.tsx
import { IssueMap } from '@/components/map/IssueMap'

export default function MapPage() {
  return (
    <div className="-mx-4 -my-6 h-[calc(100vh-4rem)]">
      <IssueMap />
    </div>
  )
}
```

- [ ] **Step 3: Test map view**

1. `npm run dev` → click "Map" in the header.
2. Verify map renders centered on Bangalore.
3. Submit 2–3 issues with different descriptions.
4. Verify colored pins appear on the map after DNA Engine runs.
5. Click a pin — verify info window shows classification and "View details →" link.

- [ ] **Step 4: Commit map view**

```bash
git add app/(main)/map/ components/map/IssueMap.tsx
git commit -m "feat: Google Maps view with severity-colored issue pins and info window popups"
```

---

## Phase 1 Done — Verification Checklist

Run through each item before calling Phase 1 complete:

- [ ] User can open `http://localhost:3000`, gets redirected to login
- [ ] Phone OTP auth completes, lands on dashboard
- [ ] "Report Issue" button → 3-step wizard (media → location → description)
- [ ] After submit, issue appears in Firestore with `status: "pending"`, `dna: null`, media URLs populated
- [ ] Within ~15 seconds, Cloud Function writes `dna` field (classification, severityScore, department, etc.)
- [ ] Dashboard live-updates: new issue card appears without page refresh
- [ ] Issue detail page: photo, description, DNA Panel (after AI runs), Status Timeline
- [ ] Map page: colored pins, click → info window → link to detail

**Phase 1 is done when all 8 items above pass.**

---

## What's Next: Phase 2

Phase 2 adds:
- Full DNA Engine with weather forecast + nearby-issue context
- Cluster detection (geohash proximity + Gemini root-cause synthesis)
- Department routing table
- Cluster markers on the map

See `docs/superpowers/plans/2026-06-25-nagar-phase2.md` (to be created after Phase 1 ships).
