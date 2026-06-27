import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import OpenAI from 'openai'
import * as https from 'https'

if (admin.apps.length === 0) admin.initializeApp()

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

const MODEL = 'google/gemma-4-31b-it'

const SYSTEM_PROMPT = `You are a civic infrastructure expert. Analyze the reported issue and respond with a JSON object only — no markdown, no explanation.

Required JSON fields:
- classification: string (e.g. "Pothole", "Water Leakage", "Broken Streetlight", "Garbage Dump", "Open Drain")
- subcategory: string (e.g. "Road pothole", "Pipe burst", "Missing manhole cover")
- rootCauseHypothesis: string (1–2 sentences)
- severityScore: number 1–10 (1=cosmetic, 10=immediate hazard)
- severityTrajectory: "stable" | "worsening" | "critical"
- trajectoryReason: string (1 sentence)
- departmentName: string (e.g. "Roads & Infrastructure", "Water Supply Board", "Street Lighting Dept")
- resolutionETA: string ISO date or null
- confidence: number 0.0–1.0`

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

      const response = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: 'text',
                text: `Issue description: "${issue.rawDescription}"\nWard: ${issue.location?.wardName ?? 'Unknown'}\n\nAnalyze the image and description. Return the JSON assessment.`,
              },
            ],
          },
        ],
      })

      const raw = JSON.parse(response.choices[0].message.content!)

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
