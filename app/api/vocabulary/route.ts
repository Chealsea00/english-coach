import { NextRequest, NextResponse } from 'next/server'
import { streamWithFallback } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { input, inputType } = await req.json()
  if (!input) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

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
    "root": "the core root morpheme only, e.g. 'empir-' or 'lev'",
    "origin": "Latin / Greek / Old French / Old English / etc.",
    "meaning": "what the root literally means, keep to 5 words",
    "prefix": "if a prefix exists: 'em-  ·  Greek en-, meaning in' — otherwise null",
    "suffix": "if a suffix exists: '-al  ·  adjective suffix, pertaining to' — otherwise null"
  },
  "relatedWords": ["word sharing same root 1", "word sharing same root 2", "word sharing same root 3"],
  "difficulty": "basic|intermediate|advanced",
  "topic": "pick the single best-fit label from the list below — use the descriptions to choose carefully:
    strategy      – business strategy, competitive positioning, market dynamics, M&A, corporate planning
    finance       – accounting, investment, P&L, budgeting, ROI, valuation, financial modeling
    operations    – supply chain, process improvement, logistics, resource allocation, efficiency
    marketing     – brand, growth, customer acquisition, campaigns, advertising, content
    technology    – software engineering, systems, platforms, cloud, infrastructure, IT
    ai            – artificial intelligence, machine learning, neural networks, LLMs, synthetic data, algorithms, models
    data          – analytics, metrics, KPIs, dashboards, data science, statistics, reporting
    leadership    – management, culture, talent, org design, executive presence, coaching
    communication – presentations, negotiations, writing, rhetoric, storytelling, persuasion
    legal         – contracts, regulation, compliance, intellectual property, litigation, governance
    product       – UX/UI, product roadmap, agile, sprint, features, user research, design
    medical       – clinical, anatomical, pharmaceutical, healthcare, and biomedical terms (e.g. obstetrician, uterine, cervical, cardiac, pathology)
    general       – anything that does not clearly fit any category above, including non-business words (scientific, academic, literary, etc.)"
}

Note: if the word has no meaningful Latin/Greek/French root (e.g. a Chinese term or modern acronym), set wordRoot to null and relatedWords to [].
Note: set prefix/suffix to null when a part genuinely does not exist — do not invent one.
Note: words like 'neural', 'synthetic', 'embedding', 'inference' → 'ai'. Words like 'obstetrician', 'uterine', 'cervical', 'cardiac' → 'medical'. When in doubt, use 'general'.`

  try {
    const stream = await streamWithFallback(prompt)
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e) {
    console.error('[/api/vocabulary]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate vocabulary card' }, { status: 500 })
  }
}
