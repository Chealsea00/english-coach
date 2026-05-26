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
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // @ts-expect-error thinkingConfig is supported but not yet in type defs
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
    const text = result.response.text().trim()
    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')
    const json = JSON.parse(text.slice(start, end + 1))
    return NextResponse.json(json)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
      return NextResponse.json({ error: 'Daily API quota reached. The free tier allows 20 requests/day — please try again tomorrow.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
