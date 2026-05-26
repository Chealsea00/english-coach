import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { original, transcribed } = await req.json()
  if (!original || !transcribed) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a pronunciation coach for non-native English professionals.

The user was supposed to say: "${original}"
The speech recognition heard: "${transcribed}"

Analyze pronunciation accuracy and fluency. Return ONLY a valid JSON object (no markdown, no code fences):
{
  "score": <number 0-100>,
  "accuracy": "excellent|good|fair|needs work",
  "matchedWords": <number of correctly pronounced words>,
  "totalWords": <total words in original>,
  "feedback": "2-3 sentences of specific, encouraging feedback",
  "focusAreas": ["specific word or sound to improve", "another area"],
  "nativeTip": "one tip on how a native speaker would say this more naturally (linking, stress, rhythm)"
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const json = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
