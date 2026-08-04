import { cleanJSON } from '@/lib/clean-json'
import { NextRequest, NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { text, sourceType } = await req.json()
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

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
    const raw = await generateWithFallback(prompt)
    return NextResponse.json(JSON.parse(cleanJSON(raw)))
  } catch (e) {
    console.error('[/api/sentence]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to analyze passage' }, { status: 500 })
  }
}
