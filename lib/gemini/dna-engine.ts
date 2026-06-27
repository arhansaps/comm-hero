import OpenAI from 'openai'
import type { IssueDNA } from '@/types'

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

const MODEL = 'google/gemma-4-31b-it'

export interface DNAEngineInput {
  imageBase64: string
  mimeType: string
  description: string
  wardName?: string
}

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

export async function runDNAEngine(input: DNAEngineInput): Promise<IssueDNA> {
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
            image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
          },
          {
            type: 'text',
            text: `Issue description: "${input.description}"\nWard: ${input.wardName ?? 'Unknown'}\n\nAnalyze the image and description. Return the JSON assessment.`,
          },
        ],
      },
    ],
  })

  const raw = JSON.parse(response.choices[0].message.content!)

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
