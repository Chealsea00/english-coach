import { cleanJSON } from '@/lib/clean-json'
import { NextRequest, NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { original, transcribed, wpm, accuracyPct } = await req.json()
  if (!original || !transcribed) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const paceLine = typeof wpm === 'number' && wpm > 0
    ? `The user's measured speaking pace was about ${wpm} words per minute (natural conversational English is ~110-160 wpm).`
    : ''
  const matchLine = typeof accuracyPct === 'number'
    ? `A word-match check found roughly ${accuracyPct}% of the target words were recognised correctly.`
    : ''

  const prompt = `You are a pronunciation coach for non-native English professionals.

The user was supposed to say: "${original}"
The speech recognition heard: "${transcribed}"
${matchLine}
${paceLine}

Where the recogniser heard a different word than the target, that word was likely mispronounced or misstressed — use those differences to infer specific issues. Return ONLY a valid JSON object (no markdown, no code fences):
{
  "score": <number 0-100>,
  "accuracy": "excellent|good|fair|needs work",
  "matchedWords": <number of correctly pronounced words>,
  "totalWords": <total words in original>,
  "feedback": "2-3 sentences of specific, encouraging feedback",
  "wordIssues": [
    { "word": "the exact target word", "type": "sound|stress", "issue": "short, concrete note e.g. 'the -tion should sound like /ʃən/' or 'stress the 2nd syllable: proˈnounce'" }
  ],
  "stressWords": ["the 3-5 target words a native speaker would emphasise most"],
  "paceComment": "one sentence on their pace and pausing, grounded in the wpm above if provided",
  "focusAreas": ["specific sound or pattern to drill", "another area"],
  "nativeTip": "one tip on how a native speaker would say this more naturally (linking, stress, rhythm)"
}

Rules:
- wordIssues: only include words that were actually likely wrong (max 5). If pronunciation was clean, return an empty array.
- stressWords: choose from words that appear in the target sentence.`

  try {
    const raw = await generateWithFallback(prompt)
    return NextResponse.json(JSON.parse(cleanJSON(raw)))
  } catch (e) {
    console.error('[/api/feedback]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate feedback' }, { status: 500 })
  }
}
