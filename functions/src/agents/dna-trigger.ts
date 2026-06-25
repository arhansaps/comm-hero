// functions/src/agents/dna-trigger.ts
import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai'
import * as https from 'https'

if (admin.apps.length === 0) admin.initializeApp()

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

const DNA_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    classification: { type: SchemaType.STRING },
    subcategory: { type: SchemaType.STRING },
    rootCauseHypothesis: { type: SchemaType.STRING },
    severityScore: { type: SchemaType.NUMBER },
    severityTrajectory: { type: SchemaType.STRING, format: 'enum', enum: ['stable', 'worsening', 'critical'] },
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
