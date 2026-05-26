import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { input, inputType } = await req.json()
  if (!input) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a Business English coach helping non-native professionals sound fluent and executive-level.

The user wants to learn about: "${input}" (input type: ${inputType === 'chinese' ? 'Chinese term' : 'English word/phrase'})

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "word": "the main English word or phrase",
  "ipa": "IPA pronunciation (e.g. /ˈsɪnərɡi/)",
  "chineseMeaning": "Chinese explanation in 1-2 sentences",
  "englishDefinition": "concise English definition",
  "pronunciationTips": "how to pronounce it naturally, including any linking or stress tips",
  "businessExamples": [
    "example sentence in a meeting context",
    "example sentence in a finance/strategy context",
    "example sentence with executive-level vocabulary"
  ],
  "alternatives": [
    {"style": "formal", "expression": "..."},
    {"style": "casual", "expression": "..."},
    {"style": "executive", "expression": "..."}
  ],
  "collocations": ["collocation 1", "collocation 2", "collocation 3"],
  "difficulty": "basic|intermediate|advanced",
  "topic": "one of: strategy|finance|operations|communication|leadership|general"
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const json = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: 'Failed to generate vocabulary card' }, { status: 500 })
  }
}
