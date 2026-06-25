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

export function severityColor(score: number | null | undefined): SeverityColor {
  if (score == null) return 'green'
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
