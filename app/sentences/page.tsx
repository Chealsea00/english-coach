'use client'
import { useState, useEffect, useCallback } from 'react'
import Nav from '@/components/Nav'
import { passageStore, statsStore } from '@/lib/storage'
import type { Passage } from '@/types'
import { Plus, Loader2, Volume2, Star, Trash2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { speak } from '@/lib/tts'

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_TYPES = [
  { value: 'meeting',     label: 'Meeting',     emoji: '🗣️' },
  { value: 'magazine',    label: 'Magazine',    emoji: '📰' },
  { value: 'newsletter',  label: 'Newsletter',  emoji: '📩' },
  { value: 'paper',       label: 'Paper',       emoji: '📄' },
  { value: 'other',       label: 'Other',       emoji: '📝' },
] as const

const SOURCE_LABELS: Record<string, string> = {
  meeting: '🗣️ Meeting', magazine: '📰 Magazine',
  newsletter: '📩 Newsletter', paper: '📄 Paper', other: '📝 Other',
}

const TONE_COLORS: Record<string, string> = {
  strategic: '#6c63ff', executive: '#a78bfa', persuasive: '#f97316',
  analytical: '#22c55e', diplomatic: '#06b6d4', authoritative: '#eab308',
}

const SAMPLE_PASSAGES = [
  {
    label: 'HBR',
    sourceType: 'magazine' as const,
    text: `The most effective leaders don't just communicate strategy — they make it visceral. They translate abstract goals into concrete actions that people at every level of the organization can understand and act on. This requires a ruthless focus on clarity, consistency, and follow-through. When leaders do this well, alignment happens naturally. When they don't, even the best strategies fail at the execution stage.`,
  },
  {
    label: 'McKinsey',
    sourceType: 'newsletter' as const,
    text: `Companies that outperform their peers over the long term share a common trait: they treat talent as a strategic asset, not a cost center. They invest disproportionately in identifying, developing, and retaining high performers — and they create cultures where top talent wants to stay. In an era of rapid technological change, this kind of human capital strategy is arguably more important than any technology investment.`,
  },
  {
    label: 'Meeting Transcript',
    sourceType: 'meeting' as const,
    text: `I want to flag a concern before we finalize the roadmap. The data we're working with is six months old, and market conditions have shifted materially since then. I'd recommend we take two weeks to refresh the baseline assumptions before committing to Q3 targets. I know that creates some timeline pressure, but I think the risk of proceeding on stale data outweighs the cost of the delay.`,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────


function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─── PassageCard ─────────────────────────────────────────────────────────────

function PassageCard({
  passage, onDelete, onFavorite,
}: { passage: Passage; onDelete: () => void; onFavorite: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const toneColor = TONE_COLORS[passage.tone?.toLowerCase()] || '#7070a0'

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="tag">{SOURCE_LABELS[passage.sourceType] || passage.sourceType}</span>
            {passage.sourceLabel && (
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent2)' }}>{passage.sourceLabel}</span>
            )}
            {passage.tone && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                background: toneColor + '18', border: `1px solid ${toneColor}40`, color: toneColor,
              }}>
                {passage.tone}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>
            {expanded ? passage.text : truncate(passage.text, 180)}
          </div>
          {!expanded && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
              {passage.chineseSummary}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          <button onClick={() => speak(passage.text)} title="Listen"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <Volume2 size={15} />
          </button>
          <button onClick={onFavorite} title="Favorite"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: passage.favorited ? '#eab308' : 'var(--muted)', padding: 4 }}>
            <Star size={15} fill={passage.favorited ? '#eab308' : 'none'} />
          </button>
          <button onClick={onDelete} title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(e => !e)} title="Expand"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Chinese summary */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>中文摘要</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{passage.chineseSummary}</div>
          </div>

          {/* Key phrases */}
          {passage.keyPhrases?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Key Phrases</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {passage.keyPhrases.map((kp, i) => (
                  <div key={i} className="card-sm" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: 14 }}>{kp.phrase}</span>
                        <button onClick={() => speak(kp.phrase)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
                          <Volume2 size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{kp.meaning}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{kp.chineseMeaning}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notable patterns */}
          {passage.notablePatterns?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Patterns Worth Imitating</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {passage.notablePatterns.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }}>✦</span>
                    <span style={{ fontSize: 13, lineHeight: 1.6 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pronunciation tip */}
          {passage.pronunciationFocus && (
            <div style={{ background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Pronunciation Focus</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{passage.pronunciationFocus}</div>
            </div>
          )}

          {/* Listen full */}
          <button onClick={() => speak(passage.text)} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
            <Volume2 size={14} /> Listen to full passage
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PassagesPage() {
  const [text, setText] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [sourceType, setSourceType] = useState<Passage['sourceType']>('magazine')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passages, setPassages] = useState<Passage[]>([])
  const [filterType, setFilterType] = useState('all')

  useEffect(() => { setPassages(passageStore.getAll()) }, [])

  const analyze = async (passageText: string, label: string, type: Passage['sourceType']) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: passageText, sourceType: type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const passage: Passage = {
        id: crypto.randomUUID(),
        text: passageText,
        sourceLabel: label,
        sourceType: type,
        chineseSummary: data.chineseSummary,
        tone: data.tone,
        keyPhrases: data.keyPhrases || [],
        notablePatterns: data.notablePatterns || [],
        pronunciationFocus: data.pronunciationFocus,
        createdAt: Date.now(),
        nextReview: Date.now() + 24 * 60 * 60 * 1000,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        favorited: false,
      }
      passageStore.add(passage)
      statsStore.addXP(20)
      setPassages(passageStore.getAll())
      setText('')
      setSourceLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    analyze(text.trim(), sourceLabel.trim(), sourceType)
  }

  const handleDelete = useCallback((id: string) => {
    passageStore.remove(id)
    setPassages(passageStore.getAll())
  }, [])

  const handleFavorite = useCallback((id: string) => {
    const p = passages.find(p => p.id === id)
    if (!p) return
    passageStore.update(id, { favorited: !p.favorited })
    setPassages(passageStore.getAll())
  }, [passages])

  const filtered = filterType === 'all' ? passages : passages.filter(p => p.sourceType === filterType)
  const usedTypes = Array.from(new Set(passages.map(p => p.sourceType)))

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 900 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Passages</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Paste paragraphs from meetings, HBR, McKinsey, newsletters — get key phrases, tone analysis, and patterns to imitate.
        </p>

        {/* Add passage form */}
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 20 }}>
          {/* Source type selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {SOURCE_TYPES.map(({ value, label, emoji }) => (
              <button key={value} type="button"
                onClick={() => setSourceType(value)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 13,
                  border: `1px solid ${sourceType === value ? 'var(--accent)' : 'var(--border)'}`,
                  background: sourceType === value ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                  color: sourceType === value ? 'var(--accent2)' : 'var(--muted)',
                  cursor: 'pointer',
                }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Source name */}
          <input
            className="input"
            placeholder={`Source name (e.g. "HBR", "Team standup", "McKinsey newsletter")`}
            value={sourceLabel}
            onChange={e => setSourceLabel(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {/* Passage text */}
          <textarea
            className="input"
            placeholder="Paste a paragraph here — from a meeting, article, newsletter, or paper…"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            style={{ resize: 'vertical', marginBottom: 12, lineHeight: 1.7 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-primary" type="submit" disabled={loading || !text.trim()}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
              {loading ? 'Analyzing…' : 'Save & Analyze'}
            </button>
            {text.trim() && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{text.trim().split(/\s+/).length} words</span>
            )}
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
        </form>

        {/* Sample passages */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BookOpen size={15} style={{ color: 'var(--accent2)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>Sample Passages to Try</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SAMPLE_PASSAGES.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface2)', borderRadius: 8,
                border: '1px solid var(--border)', padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600, marginBottom: 6 }}>
                      {SOURCE_LABELS[s.sourceType]} · {s.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                      {truncate(s.text, 140)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => analyze(s.text, s.label, s.sourceType)}
                    style={{
                      flexShrink: 0, padding: '5px 14px', borderRadius: 6,
                      border: '1px solid var(--border)', fontSize: 12,
                      background: 'var(--surface)', color: 'var(--accent2)',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                    + Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Library */}
        {passages.length > 0 && (
          <>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['all', ...usedTypes].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${filterType === t ? 'var(--accent)' : 'var(--border)'}`,
                    background: filterType === t ? 'var(--accent)' : 'var(--surface2)',
                    color: filterType === t ? 'white' : 'var(--muted)',
                    cursor: 'pointer',
                  }}>
                  {t === 'all' ? 'All' : SOURCE_LABELS[t] || t}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              {filtered.length} passage{filtered.length !== 1 ? 's' : ''}
            </div>

            {filtered.map(p => (
              <PassageCard
                key={p.id}
                passage={p}
                onDelete={() => handleDelete(p.id)}
                onFavorite={() => handleFavorite(p.id)}
              />
            ))}
          </>
        )}

        {passages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No passages saved yet</div>
            <div style={{ fontSize: 14 }}>Paste a paragraph above, or try a sample passage</div>
          </div>
        )}
      </main>
    </div>
  )
}
