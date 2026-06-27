import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { runDNAEngine } from '@/lib/gemini/dna-engine'

export async function POST(req: NextRequest) {
  const { issueId } = await req.json()
  if (!issueId) return NextResponse.json({ error: 'missing issueId' }, { status: 400 })

  console.log(`[analyze] starting for issue ${issueId}`)

  const issueRef = adminDb.doc(`issues/${issueId}`)
  const snap = await issueRef.get()
  if (!snap.exists) return NextResponse.json({ error: 'issue not found' }, { status: 404 })

  const issue = snap.data()!
  if (!issue.media?.length) return NextResponse.json({ error: 'no media' }, { status: 400 })

  console.log(`[analyze] fetching image: ${issue.media[0].slice(0, 60)}...`)
  const imgRes = await fetch(issue.media[0])
  if (!imgRes.ok) {
    console.error(`[analyze] image fetch failed: ${imgRes.status}`)
    return NextResponse.json({ error: 'image fetch failed' }, { status: 500 })
  }
  const buf = await imgRes.arrayBuffer()
  const mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  console.log(`[analyze] image fetched, size=${buf.byteLength}, mimeType=${mimeType}`)

  console.log(`[analyze] calling DNA engine...`)
  const dna = await runDNAEngine({
    imageBase64: Buffer.from(buf).toString('base64'),
    mimeType,
    description: issue.rawDescription,
    wardName: issue.location?.wardName,
  })
  console.log(`[analyze] DNA result: ${dna.classification}, severity=${dna.severityScore}`)

  await issueRef.update({ dna, updatedAt: new Date() })
  console.log(`[analyze] Firestore updated for ${issueId}`)

  return NextResponse.json({ ok: true })
}
