# NAGAR — Neighborhood Agentic Guardian for Accountability & Resolution

> Civic issue reporting where the AI is the resolution advocate, not just the classifier.

---

## What is NAGAR

Every civic app (Swachh Bharat, BBMP Connect, FixMyStreet) is a ticketing system. You report, get a ticket number, wait, give up. The "AI" in most of them answers one question: *what type of issue is this?*

NAGAR's AI answers: what is this, why does it exist, is it part of a larger infrastructure failure, how bad will it get in 48 hours, who exactly is responsible, when will it be fixed, and what do we do if they stall?

**5 core innovations:**
1. **WhatsApp-native reporting** — no app download. Gemini-powered bot accepts photo, voice, or casual text and files the report entirely within WhatsApp. Fallback: voice IVR (call a number, speak in Hindi/regional language) and physical QR codes on neighborhood boards (scan → location pre-loaded → done).
2. **Issue DNA Engine** — Gemini creates a multi-dimensional fingerprint per report: classification, root cause hypothesis, cluster membership (are 8 similar reports within 150m?), severity trajectory (how bad in 48h given weather), department routing (zone-level, not just "municipality"), and resolution ETA based on the ward's historical pattern.
3. **Silent Witness Network** — users within 150m of an open issue get a single FCM notification. One tap (Yes bad / Yes minor / No / Worse). Three confirmations = validated. Zero form, zero account needed.
4. **Resolution Advocate Agent** — autonomous escalation agent. Day 3 → 7 → 14 → 21 escalation ladder. Drafts follow-ups, senior officer escalations, RTI applications, and social pressure packs. Every escalation requires one-tap citizen approval.
5. **Infrastructure Memory Map** — predictive layer. Repeat-failure hotspots, monsoon vulnerability overlay, ward accountability scores. Reactive → proactive.

---

## Tech Stack

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Maps | Google Maps JS API via `@vis.gl/react-google-maps` |
| Auth | Firebase Auth (phone OTP — no passwords) |
| State | Zustand |
| PWA | next-pwa (offline support, installable) |

### Backend
| Layer | Choice |
|---|---|
| Primary DB | Firestore |
| Live updates | Firebase Realtime Database (issue status tracking) |
| Functions | Firebase Cloud Functions (Node.js 20) |
| Storage | Firebase Storage (images, videos) |
| Push | Firebase Cloud Messaging (FCM) |
| Hosting | Firebase Hosting |
| Scheduling | Cloud Scheduler → Cloud Functions (escalation agent) |

### AI — all via Google AI Studio / Gemini API
| Layer | Choice |
|---|---|
| Core model | Gemini 2.0 Flash (`gemini-2.0-flash`) |
| Vision preprocessing | Google Cloud Vision API (quality check before Gemini) |
| Voice input | Google Cloud Speech-to-Text API |
| Translation | Google Cloud Translation API |
| Prediction (Phase 5) | Vertex AI — rule-based fallback acceptable for hackathon |

### External
| Layer | Choice |
|---|---|
| WhatsApp | WhatsApp Cloud API (Meta) — webhook via Cloud Functions |
| Maps | Google Maps Platform (Maps JS, Geocoding, Places, Geolocation) |
| Weather | Open-Meteo (free, no key needed) — for severity trajectory |
| QR codes | `qrcode` npm package |
| PDF (RTI) | `jsPDF` (client-side RTI document generation) |
| Analytics | Looker Studio connected to Firestore (ward dashboards) |

---

## Project Structure

```
nagar/
├── app/
│   ├── (auth)/
│   │   └── login/                    # phone OTP auth page
│   ├── (main)/
│   │   ├── dashboard/                # citizen home, issue feed
│   │   ├── report/                   # 3-step issue submission flow
│   │   ├── issue/[id]/               # issue detail + DNA panel + escalation timeline
│   │   ├── map/                      # Infrastructure Memory Map (fullscreen)
│   │   └── ward/[wardId]/            # public ward accountability dashboard
│   └── api/
│       └── whatsapp/
│           └── webhook/route.ts      # WhatsApp Cloud API webhook
├── components/
│   ├── map/
│   │   ├── IssueMap.tsx              # Google Maps with issue pins
│   │   ├── ClusterMarker.tsx         # grouped issue cluster on map
│   │   └── HeatmapLayer.tsx          # Infrastructure Memory Map overlay
│   ├── issue/
│   │   ├── IssueCard.tsx
│   │   ├── DNAPanel.tsx              # displays full DNA Engine output
│   │   ├── EscalationTimeline.tsx    # visual Day 0→3→7→14→21 ladder
│   │   ├── SilentWitnessCard.tsx     # the FCM notification card UI
│   │   └── ReportStepper.tsx         # 3-step submission wizard
│   └── ui/                           # shadcn components
├── lib/
│   ├── gemini/
│   │   ├── dna-engine.ts             # Issue DNA Engine — main Gemini prompt + JSON parser
│   │   ├── whatsapp-bot.ts           # WhatsApp conversation agent (multi-turn)
│   │   ├── cluster-inference.ts      # cluster root cause generation
│   │   ├── escalation-drafter.ts     # generates follow-up / senior escalation text
│   │   └── rti-generator.ts          # RTI application text generation
│   ├── firebase/
│   │   ├── admin.ts                  # Firebase Admin SDK init (server-side)
│   │   ├── client.ts                 # Firebase client SDK init
│   │   ├── issues.ts                 # typed Firestore CRUD for issues
│   │   ├── clusters.ts               # cluster CRUD
│   │   ├── users.ts                  # user CRUD + trust score updates
│   │   └── fcm.ts                    # FCM batch send helpers
│   ├── maps/
│   │   ├── geohash.ts                # geohash encode/decode (geofire-common)
│   │   ├── cluster.ts                # geospatial clustering algorithm
│   │   └── proximity.ts              # find users/issues within radius
│   ├── whatsapp/
│   │   └── client.ts                 # WhatsApp Cloud API send-message wrapper
│   └── weather.ts                    # Open-Meteo fetch for 48h forecast
├── functions/
│   └── src/
│       ├── index.ts                  # function exports
│       ├── whatsapp/
│       │   └── webhook.ts            # incoming WhatsApp message handler
│       └── agents/
│           ├── dna-trigger.ts        # Firestore onCreate → run DNA Engine
│           ├── cluster-agent.ts      # Firestore onCreate → cluster detection
│           ├── silent-witness.ts     # Firestore onUpdate (validated) → FCM proximity push
│           └── resolution-advocate.ts # scheduled daily → escalation checker
├── types/
│   └── index.ts                      # all shared TypeScript interfaces
├── scripts/
│   └── seed-demo-data.ts             # seed realistic issues for demo
└── .env.local
```

---

## Data Models

### `issues` (Firestore)

```typescript
interface Issue {
  id: string
  reportedBy: string                   // userId
  channel: 'app' | 'whatsapp' | 'voice' | 'qr'
  location: {
    lat: number
    lng: number
    geohash: string                    // for proximity queries
    address: string
    wardId: string
    wardName: string
  }
  media: string[]                      // Firebase Storage URLs
  rawDescription: string               // user's original text / voice transcript

  dna: {
    classification: string             // "Pothole" | "Water Leakage" | "Broken Streetlight" | etc.
    subcategory: string
    rootCauseHypothesis: string        // e.g. "Likely drainage failure from adjacent construction"
    clusterId: string | null
    severityScore: number              // 1–10
    severityTrajectory: 'stable' | 'worsening' | 'critical'
    trajectoryReason: string           // e.g. "Heavy rain forecast in 36h will worsen leakage"
    department: {
      name: string
      zoneId: string
      contactEmail: string
    }
    resolutionETA: string | null       // ISO date
    confidence: number                 // 0–1
  }

  status: 'pending' | 'validated' | 'assigned' | 'in_progress' | 'resolved' | 'escalated'
  validationCount: number
  escalationLevel: 0 | 1 | 2 | 3 | 4  // 0=filed, 1=follow-up sent, 2=senior, 3=RTI, 4=social
  lastEscalationAt: Timestamp | null
  resolvedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `clusters` (Firestore)

```typescript
interface Cluster {
  id: string
  issueIds: string[]
  centroid: { lat: number; lng: number; geohash: string }
  classification: string
  inferredRootCause: string            // Gemini-generated for the cluster as a whole
  wardId: string
  severityScore: number
  status: 'open' | 'resolved'
  createdAt: Timestamp
}
```

### `validations` (subcollection under each issue)

```typescript
interface Validation {
  userId: string
  response: 'confirmed_bad' | 'confirmed_minor' | 'denied' | 'worse'
  createdAt: Timestamp
}
```

### `users` (Firestore)

```typescript
interface User {
  id: string
  phone: string
  name: string
  wardId: string
  geohash: string                      // home location for Silent Witness proximity
  trustScore: number                   // 0–100, updated on validation outcomes
  fcmToken: string
  preferredLanguage: string            // 'en' | 'hi' | 'kn' | etc.
  createdAt: Timestamp
}
```

### `escalation_drafts` (subcollection under each issue)

```typescript
interface EscalationDraft {
  level: 1 | 2 | 3 | 4
  type: 'follow_up' | 'senior_escalation' | 'rti' | 'social_pack'
  content: string                      // Gemini-generated text / RTI body
  status: 'pending_approval' | 'approved' | 'sent' | 'dismissed'
  generatedAt: Timestamp
  sentAt: Timestamp | null
}
```

---

## Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=           # from service account JSON
FIREBASE_ADMIN_CLIENT_EMAIL=

# Google AI Studio
GEMINI_API_KEY=

# Google Cloud (same project, different APIs)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_CLOUD_STT_API_KEY=
GOOGLE_CLOUD_TRANSLATE_API_KEY=
GOOGLE_CLOUD_VISION_API_KEY=

# WhatsApp Cloud API
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=                # any string you choose for webhook verification

# Phase 5
VERTEX_AI_PROJECT_ID=
VERTEX_AI_LOCATION=asia-south1
```

---

## Phases

### Phase 1 — Core MVP
**Target: working app, basic AI, issue on a map**

- [ ] Firebase project setup (Auth, Firestore, Storage, FCM, Hosting)
- [ ] Next.js scaffold: Tailwind + shadcn + folder structure above
- [ ] Firebase Auth: phone OTP login (India number format)
- [ ] `ReportStepper`: 3-step flow — photo/video upload → pin location on Google Maps → description
- [ ] Upload media to Firebase Storage, store issue doc in Firestore
- [ ] Firestore `onCreate` trigger → basic Gemini call: send image + description → get classification + severity score (simplified DNA — no clustering yet)
- [ ] Issue list view (dashboard) + individual issue detail page
- [ ] Google Maps: render issue pins color-coded by severity
- [ ] Status timeline UI on issue detail page

**Done when:** A user can open the web app, file an issue with a photo, see it on the map with a severity score.

---

### Phase 2 — Full DNA Engine
**Target: Gemini doing real inference, clusters forming**

- [ ] Full DNA Engine prompt in `lib/gemini/dna-engine.ts`
  - Input: image(s), raw description, lat/lng, ward name, nearby issue count + types (within 150m), 48h weather forecast from Open-Meteo
  - Output: strict JSON matching the `dna` field schema (use Gemini JSON mode, temp 0.2)
  - Parse and validate the response, store to Firestore
- [ ] `DNAPanel` component: render classification, root cause, severity with trajectory badge, department, ETA
- [ ] Cluster detection in `functions/agents/cluster-agent.ts`
  - Firestore `onCreate` trigger
  - Geohash query (via `geofire-common`) → issues within 150m of same classification
  - If 3+ found: create/update cluster doc, link issues via `clusterId`
- [ ] Cluster root cause inference: when cluster forms, call Gemini with all clustered reports → generate unified root cause hypothesis
- [ ] Cluster view on Google Maps: grouped marker showing issue count + inferred cause
- [ ] Department routing table: `data/departments.json` mapping issue type → ward dept

**Done when:** Every issue has a full DNA card. Related issues auto-merge into clusters on the map with a Gemini-generated root cause.

---

### Phase 3 — Reporting Channels + Community
**Target: WhatsApp bot, voice, QR codes, Silent Witness working**

- [ ] WhatsApp Cloud API webhook (`app/api/whatsapp/webhook/route.ts`)
  - Verify webhook with `WHATSAPP_VERIFY_TOKEN` on GET
  - Handle incoming messages on POST: photo attachment → download → run DNA Engine → reply with summary + tracking link
  - Multi-turn conversation state stored in Firestore `whatsapp_sessions/{phone}`
  - Gemini handles unstructured text input (extracts issue type, asks for location if not shared)
- [ ] WhatsApp send wrapper in `lib/whatsapp/client.ts` (POST to WhatsApp Cloud API)
- [ ] Google Cloud Speech-to-Text: add voice recording input to `ReportStepper`, transcribe → fill description field
- [ ] Google Cloud Translation: detect language on WhatsApp input, translate to English before DNA Engine, respond in original language
- [ ] QR code generation: `/ward/[wardId]/qr` route generates a QR that opens a pre-filled report URL with ward + approximate location
- [ ] Silent Witness (`functions/agents/silent-witness.ts`)
  - Trigger: Firestore `onUpdate` when `validationCount` goes from 0 to 1 (first confirmation)
  - Query users with geohash within 150m using `geofire-common`
  - Batch FCM send with data payload: `{ issueId, type: 'silent_witness', previewText }`
  - Client renders a notification action card (shadcn Sheet or Alert) with 4 tap options
  - On response: update `validations` subcollection, recalculate `validationCount`, update severity if "worse" responses dominate
- [ ] Trust Score: +5 on confirmed report that resolves, -3 on denied validation

**Done when:** WhatsApp photo → filed issue with DNA. FCM validation card appearing for nearby users.

---

### Phase 4 — Resolution Advocate Agent
**Target: autonomous escalation working end-to-end**

- [ ] Cloud Scheduler job: runs daily at 08:00 IST → triggers `resolution-advocate` Cloud Function
- [ ] Escalation logic in `functions/agents/resolution-advocate.ts`:
  ```
  Query issues WHERE status != 'resolved' AND escalationLevel < 4
  For each:
    daysSinceLastUpdate = now - updatedAt
    daysSinceCreated = now - createdAt
    
    if escalationLevel == 0 and daysSinceCreated >= 3:
      → generateFollowUp(issue) → store EscalationDraft(level=1) → FCM to reporter
    if escalationLevel == 1 and daysSinceLastUpdate >= 4:
      → generateSeniorEscalation(issue) → store EscalationDraft(level=2) → FCM
    if escalationLevel == 2 and daysSinceLastUpdate >= 7:
      → generateRTI(issue) → store EscalationDraft(level=3) → FCM
    if escalationLevel == 3 and daysSinceLastUpdate >= 7:
      → generateSocialPack(issue) → store EscalationDraft(level=4) → FCM
  ```
- [ ] Gemini prompts for each escalation type in `lib/gemini/escalation-drafter.ts` and `rti-generator.ts`
  - RTI: structured under RTI Act 2005 format. Include applicant info, issue description, dates, evidence of inaction, specific info requested
- [ ] `EscalationTimeline` component: visual step ladder showing current level and next threshold date
- [ ] One-tap approval UI: when reporter opens app, pending `EscalationDraft` shows with edit + approve/dismiss actions
- [ ] On approve: mark draft as `sent`, bump `escalationLevel`, update `lastEscalationAt`
- [ ] RTI → PDF: on client, use `jsPDF` to render approved RTI text as downloadable PDF

**Done when:** A stalled issue automatically generates follow-up → senior escalation → RTI draft over 2 weeks, all requiring only one-tap approval from the citizen.

---

### Phase 5 — Predictive Layer + Polish
**Target: Memory Map, ward dashboard, accessibility, demo-ready**

- [ ] Infrastructure Memory Map (`/map` route)
  - Heatmap layer: aggregate issues by location over all time, render with Google Maps Heatmap layer
  - Monsoon vulnerability: hardcode a GeoJSON overlay for flood-prone areas in the demo ward (or use public flood zone data)
  - Ward accountability tiles: fetch per-ward stats (total issues, avg resolution days, open rate) from Firestore aggregation, render as colored ward boundaries
- [ ] Ward dashboard (`/ward/[wardId]`): resolution rate %, avg days to close, issue breakdown by type, comparison to city average — public, no auth required
- [ ] Connect Looker Studio to Firestore via BigQuery export for the ward dashboard (or build custom Next.js charts with Recharts as fallback)
- [ ] "Fix Together" mode: on issue detail, button to mark as community-fixable → creates a `fix_together_session` doc → volunteers sign up via app → first volunteer becomes coordinator
- [ ] Accessibility: large text toggle (Tailwind `text-lg` baseline, bump to `text-xl` on toggle), high contrast mode (CSS class on `<html>`), ensure all primary actions are reachable in ≤ 3 taps
- [ ] Demo seed script (`scripts/seed-demo-data.ts`): generate 40–60 realistic issues across a single ward (mix of potholes, water leaks, streetlights) with varied statuses, escalation levels, and resolution times — makes the map look populated for judges
- [ ] Vertex AI: if time permits, train a simple tabular model on seed data to predict resolution ETA more accurately than rule-based. Otherwise keep rule-based and label it "v1 prediction model."

**Done when:** The map shows hotspots, the ward dashboard is live, the demo looks like a real city.

---

## Key Implementation Notes

**DNA Engine — Gemini call structure:**
Use `responseSchema` (structured output / JSON mode). Pass temperature 0.2. Always include nearby issue context for cluster detection. If Gemini returns low confidence (<0.6), flag the issue for manual review rather than auto-routing.

**WhatsApp session state:**
Store in Firestore `whatsapp_sessions/{e164Phone}` with fields: `step` (0=new, 1=awaiting_location, 2=confirming), `partialIssue`, `expiresAt` (30 min TTL). On each incoming message, read session → determine step → respond accordingly.

**Geospatial queries (Silent Witness + clustering):**
Use `geofire-common` library for geohash. Store `geohash` field on every user and issue. Query with `geohashQueryBounds(center, radiusM)` → multiple Firestore range queries → client-side distance filter. This is the standard Firestore geospatial pattern — don't use GeoFirestore (outdated).

**Escalation agent — avoid double-firing:**
Use a Firestore transaction when bumping `escalationLevel` to prevent the daily cron from creating duplicate drafts on concurrent runs.

**FCM for Silent Witness on web:**
Firebase Cloud Messaging works on web via Service Worker. Set up `firebase-messaging-sw.js` at root. Request permission on first login. Store token to user doc. For the notification card UI, handle FCM data messages in the SW and show a custom notification with action buttons — not just a plain push.

**WhatsApp Cloud API gotcha:**
The webhook must respond with HTTP 200 within 20 seconds or WhatsApp retries. For heavy DNA Engine calls (Gemini + Vision can take 5–8s), acknowledge the webhook immediately, process async in a queued Cloud Function, then send the reply message via a separate WhatsApp API call once processing is done.

**For the hackathon demo:**
Prioritize Phases 1, 2, and 4 (DNA Engine + Advocate Agent) for judges. Phase 3 WhatsApp is high-impact visually. Phase 5 Memory Map is the best slide material. If time is tight, fake the Vertex AI prediction with a rule-based lookup table — judges won't know the difference and the concept is what matters.