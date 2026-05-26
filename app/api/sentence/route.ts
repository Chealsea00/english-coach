import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { text, sourceType } = await req.json()
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a Business English coach helping a non-native Chinese professional master fluent, executive-level English.

Analyze this passage from a ${sourceType || 'business'} source:

"""
${text}
"""

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "chineseSummary": "2-3 sentence Chinese summary of what this passage is saying",
  "tone": "one word describing the writing style: e.g. strategic / executive / persuasive / analytical / diplomatic / authoritative",
  "keyPhrases": [
    {
      "phrase": "an important multi-word expression or power phrase from the passage",
      "meaning": "what it means in business context",
      "chineseMeaning": "Chinese explanation"
    }
  ],
  "notablePatterns": [
    "a sentence structure or rhetorical pattern worth imitating, with a brief explanation of why it works",
    "another pattern"
  ],
  "pronunciationFocus": "one specific tip on how to read this passage naturally — stress, rhythm, or linking words to focus on"
}

Extract 5-7 keyPhrases. Focus on power phrases, collocations, and executive-level expressions a non-native speaker would benefit from knowing.`

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()
    const json = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    return NextResponse.json(json)
  } catch (e) {
    console.error('Passage analysis error:', e)
    return NextResponse.json({ error: 'Failed to analyze passage' }, { status: 500 })
  }
}
