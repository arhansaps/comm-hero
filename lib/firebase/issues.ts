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
