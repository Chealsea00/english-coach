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
  "wordRoot": {
    "root": "the core root morpheme(s), e.g. 'lev' or 'syn- + erg'",
    "origin": "Latin / Greek / Old French / Old English / etc.",
    "meaning": "what the root literally means"
  },
  "relatedWords": ["word sharing same root 1", "word sharing same root 2", "word sharing same root 3"],
  "difficulty": "basic|intermediate|advanced",
  "topic": "one of: strategy|finance|operations|communication|leadership|general"
}

Note: if the word is a Chinese-derived term or has no meaningful Latin/Greek root, set wordRoot to null and relatedWords to [].`

  try {
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // @ts-expect-error thinkingConfig is supported but not yet in type defs
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            controller.enqueue(encoder.encode(chunk.text()))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
      return NextResponse.json({ error: 'Daily API quota reached. The free tier allows 20 requests/day — please try again tomorrow.' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Failed to generate vocabulary card' }, { status: 500 })
  }
}
