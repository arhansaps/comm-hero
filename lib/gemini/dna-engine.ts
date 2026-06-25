// lib/gemini/dna-engine.ts
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { ResponseSchema } from '@google/generative-ai'
import type { IssueDNA } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface DNAEngineInput {
  imageBase64: string      // base64-encoded image bytes
  mimeType: string         // e.g. 'image/jpeg'
  description: string
  wardName?: string
}

const DNA_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    classification: { type: SchemaType.STRING },
    subcategory: { type: SchemaType.STRING },
    rootCauseHypothesis: { type: SchemaType.STRING },
    severityScore: { type: SchemaType.NUMBER },
    severityTrajectory: {
      type: SchemaType.STRING,
      format: 'enum',
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
    confidence: Math.min(1, Math.max(0, raw.confidence)),
  }
}
