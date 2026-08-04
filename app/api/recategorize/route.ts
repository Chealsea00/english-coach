import { cleanJSON } from '@/lib/clean-json'
import { NextRequest, NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/ai'

const TOPIC_LIST = `strategy|finance|operations|marketing|technology|ai|data|leadership|communication|legal|product|medical|general`

const TOPIC_GUIDE = `
  strategy      – business strategy, competitive positioning, market dynamics, M&A
  finance       – accounting, investment, P&L, budgeting, ROI, valuation
  operations    – supply chain, process improvement, logistics, efficiency
  marketing     – brand, growth, customer acquisition, campaigns
  technology    – software engineering, systems, cloud, platforms, IT
  ai            – artificial intelligence, machine learning, neural networks, LLMs, synthetic data, algorithms
  data          – analytics, metrics, KPIs, dashboards, statistics, reporting
  leadership    – management, culture, talent, org design, executive presence
  communication – presentations, negotiations, rhetoric, storytelling, persuasion
  legal         – contracts, regulation, compliance, intellectual property, governance
  product       – UX/UI, product roadmap, agile, sprint, user research, design
  medical       – clinical, anatomical, pharmaceutical, healthcare, biomedical terms (e.g. obstetrician, uterine, cervical, cardiac, pathology)
  general       – anything that doesn't clearly fit above categories; use this as the catch-all`

export async function POST(req: NextRequest) {
  const { words } = await req.json() as { words: string[] }
  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ error: 'Missing words array' }, { status: 400 })
  }

  const prompt = `You are a vocabulary classifier for a Business English learning app.

Classify each word/phrase below into exactly ONE topic from this list: ${TOPIC_LIST}

Topic descriptions:
${TOPIC_GUIDE}

Important rules:
- Medical/anatomical words (uterine, cervical, cardiac, obstetrician) → "medical"
- When in doubt, use "general" — do not use "other"
- AI/ML words (neural, synthetic, embedding, inference, algorithm) → "ai"
- Respond with ONLY a valid JSON object mapping each word to its topic.
- No markdown, no code fences, no explanation.

Words to classify:
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Return format (use the exact words as keys):
{
  "word1": "topic",
  "word2": "topic"
}`

  try {
    const raw     = await generateWithFallback(prompt)
    const mapping = JSON.parse(cleanJSON(raw)) as Record<string, string>
    return NextResponse.json({ mapping })
  } catch (e) {
    console.error('[/api/recategorize]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Re-categorisation failed' }, { status: 500 })
  }
}
