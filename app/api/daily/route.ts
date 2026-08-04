import { NextRequest, NextResponse } from 'next/server'
import { streamWithFallback } from '@/lib/ai'
import { TOPIC_PROMPT_GUIDE } from '@/lib/topics'

export async function POST(req: NextRequest) {
  const { text, inputType } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  const mode: 'english' | 'chinese' = inputType === 'chinese' ? 'chinese' : 'english'

  const prompt = mode === 'chinese' ? `You are a Business English coach helping a non-native Chinese-speaking professional learn how to express their own idea fluently and naturally in English.

The user wrote this in Chinese — they want to know how a fluent, articulate professional would say this same idea in natural English:
"${text.trim()}"

First, compose a natural, idiomatic English version that captures the same meaning, tone, and intent — NOT a stiff literal translation. Make it sound like something a native speaker would actually say, matching the register implied by the Chinese (casual chat vs. formal business writing).

Then analyze that English version exactly as you would analyze any spoken sentence.

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "englishText": "the natural English expression of the user's idea",
  "tone": "one short phrase: e.g. 'frustrated complaint', 'casual chat', 'sarcastic vent', 'polite request', 'excited announcement'",
  "register": "informal | semi-formal | formal",
  "keyPhrases": [
    {
      "phrase": "exact phrase from the English text you composed",
      "meaning": "what it really means in plain English, including any idiom or implied emotion",
      "chineseMeaning": "中文解释"
    }
  ],
  "stressedWords": ["word or short phrase to stress for natural delivery", "..."],
  "naturalTips": [
    "specific tip for speaking this naturally, e.g. linking sounds, reductions, rhythm",
    "another tip"
  ],
  "pronunciationNote": "one overall sentence on how to deliver the full text naturally — rhythm, pace, emotion",
  "topic": "pick the single best-fit label from the list below for the English text you composed — use the descriptions to choose carefully:
    ${TOPIC_PROMPT_GUIDE}"
}

Rules:
- keyPhrases: pick 3-6 interesting/useful phrases or expressions from the ENGLISH text you composed. Skip plain common words.
- stressedWords: the 3-5 words/phrases a native speaker would naturally emphasise in the English version.
- naturalTips: 2-4 concrete, actionable tips (linking, reduction, dropped sounds, rhythm) for the English version.
- Match the tone/register to what the Chinese text implies.` : `You are an English coach helping a non-native Chinese speaker understand and speak natural everyday English.

Analyze this sentence or passage:
"${text.trim()}"

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "chineseTranslation": "complete, natural Chinese translation of the full text",
  "tone": "one short phrase: e.g. 'frustrated complaint', 'casual chat', 'sarcastic vent', 'polite request', 'excited announcement'",
  "register": "informal | semi-formal | formal",
  "keyPhrases": [
    {
      "phrase": "exact phrase from the text",
      "meaning": "what it really means in plain English, including any idiom or implied emotion",
      "chineseMeaning": "中文解释"
    }
  ],
  "stressedWords": ["word or short phrase to stress for natural delivery", "..."],
  "naturalTips": [
    "specific tip for speaking this naturally, e.g. linking sounds, reductions, rhythm",
    "another tip"
  ],
  "pronunciationNote": "one overall sentence on how to deliver the full text naturally — rhythm, pace, emotion",
  "topic": "pick the single best-fit label from the list below — use the descriptions to choose carefully:
    ${TOPIC_PROMPT_GUIDE}"
}

Rules:
- keyPhrases: pick 3-6 interesting/non-obvious phrases, idioms, or emotionally loaded expressions. Skip plain common words.
- stressedWords: the 3-5 words/phrases a native speaker would naturally emphasise.
- naturalTips: 2-4 concrete, actionable tips (linking, reduction, dropped sounds, rhythm).
- Be sensitive to tone — if the sentence is venting or emotional, reflect that in the analysis.`

  try {
    const stream = await streamWithFallback(prompt)
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e) {
    console.error('[/api/daily]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Analysis failed' }, { status: 500 })
  }
}
