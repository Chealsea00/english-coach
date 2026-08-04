export const TOPIC_COLORS: Record<string, string> = {
  strategy:      '#6c63ff',
  finance:       '#22c55e',
  operations:    '#f97316',
  marketing:     '#ec4899',
  technology:    '#06b6d4',
  ai:            '#8b5cf6',
  data:          '#3b82f6',
  leadership:    '#eab308',
  communication: '#a78bfa',
  legal:         '#64748b',
  product:       '#14b8a6',
  medical:       '#f43f5e',
  general:       '#7070a0',
  other:         '#7070a0', // legacy fallback — maps to same colour as general
}

export const TOPIC_PROMPT_GUIDE = `strategy      – business strategy, competitive positioning, market dynamics, M&A, corporate planning
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
    general       – anything that does not clearly fit any category above, including casual everyday conversation`
