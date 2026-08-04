'use client'
import { useState, useEffect, useCallback } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, statsStore } from '@/lib/storage'
import type { VocabWord } from '@/types'
import { Search, Loader2, Volume2, Pause, Trash2, ChevronDown, ChevronUp, CheckCircle2, X, Star, Tag } from 'lucide-react'
import TagEditor from '@/components/TagEditor'
import NextSteps from '@/components/NextSteps'
import { MessageCircle, Mic, RotateCcw } from 'lucide-react'
import { speak } from '@/lib/tts'
import { useTTS } from '@/lib/useTTS'
import { cleanJSON } from '@/lib/clean-json'
import { TOPIC_COLORS } from '@/lib/topics'

// ── Progressive JSON field extraction ────────────────────────────────────────
// Reads fields out of a partially-streamed JSON string as they become available.
function extractPartial(raw: string) {
  const str = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'))
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : undefined
  }
  const arr = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`))
    if (!m) return undefined
    return [...m[1].matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)].map(x => x[1])
  }
  const objArr = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`))
    if (!m) return undefined
    const items: { style: string; expression: string }[] = []
    const block = m[1]
    const styleMatches = [...block.matchAll(/"style"\s*:\s*"([^"]+)"/g)]
    const exprMatches  = [...block.matchAll(/"expression"\s*:\s*"([^"]+)"/g)]
    styleMatches.forEach((sm, i) => {
      if (exprMatches[i]) items.push({ style: sm[1], expression: exprMatches[i][1] })
    })
    return items.length ? items : undefined
  }
  const wordRoot = () => {
    const m = raw.match(/"wordRoot"\s*:\s*\{([\s\S]*?)\}/)
    if (!m) return undefined
    const block = m[1]
    const root    = block.match(/"root"\s*:\s*"([^"]+)"/)
    const origin  = block.match(/"origin"\s*:\s*"([^"]+)"/)
    const meaning = block.match(/"meaning"\s*:\s*"([^"]+)"/)
    if (!root || !origin || !meaning) return undefined
    const prefixM = block.match(/"prefix"\s*:\s*"([^"]+)"/)
    const suffixM = block.match(/"suffix"\s*:\s*"([^"]+)"/)
    return {
      root: root[1], origin: origin[1], meaning: meaning[1],
      prefix: prefixM ? prefixM[1] : null,
      suffix: suffixM ? suffixM[1] : null,
    }
  }
  return {
    word:             str('word'),
    ipa:              str('ipa'),
    chineseMeaning:   str('chineseMeaning'),
    englishDefinition:str('englishDefinition'),
    pronunciationTips:str('pronunciationTips'),
    difficulty:       str('difficulty') as VocabWord['difficulty'] | undefined,
    topic:            str('topic'),
    businessExamples: arr('businessExamples'),
    collocations:     arr('collocations'),
    alternatives:     objArr('alternatives'),
    wordRoot:         wordRoot(),
    relatedWords:     arr('relatedWords'),
  }
}

type Partial_VocabWord = ReturnType<typeof extractPartial>

// ── Word Structure block (shared by VocabCard + streaming preview) ────────────
type WordRootData = {
  root: string; origin: string; meaning: string
  prefix?: string | null; suffix?: string | null
}

function WordStructureBlock({ wordRoot, relatedWords }: { wordRoot: WordRootData; relatedWords?: string[] }) {
  const { ttsState, ttsText } = useTTS()
  const parts = [
    wordRoot.prefix ? { label: 'Prefix', value: wordRoot.prefix } : null,
    { label: 'Root', value: `${wordRoot.root}  ·  ${wordRoot.origin}  ·  "${wordRoot.meaning}"` },
    wordRoot.suffix ? { label: 'Suffix', value: wordRoot.suffix } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div style={{
      background: 'rgba(59,111,212,0.07)',
      border: '1px solid rgba(59,111,212,0.2)',
      borderRadius: 8, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Word Structure
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {parts.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--accent2)',
              background: 'rgba(59,111,212,0.15)', borderRadius: 4,
              padding: '1px 7px', flexShrink: 0, minWidth: 44, textAlign: 'center',
            }}>
              {label}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{value}</span>
          </div>
        ))}
      </div>
      {relatedWords && relatedWords.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Words sharing this root</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {relatedWords.map((w, i) => (
              <button key={i} onClick={() => speak(w)} style={{
                background: 'rgba(59,111,212,0.12)', border: '1px solid rgba(59,111,212,0.25)',
                borderRadius: 5, padding: '3px 10px', fontSize: 13, color: 'var(--accent2)',
                cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {ttsText === w && ttsState === 'playing' ? <Pause size={11} /> : <Volume2 size={11} />}
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VocabCard({ word, onDelete, onToggleStar, onUpdateTags }: {
  word: VocabWord
  onDelete: () => void
  onToggleStar?: () => void
  onUpdateTags?: (tags: string[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { ttsState, ttsText }   = useTTS()

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{word.word}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{word.ipa}</span>
            <button onClick={() => speak(word.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
              {ttsText === word.word && ttsState === 'playing' ? <Pause size={14} /> : <Volume2 size={14} />}
            </button>
            <span className="tag" style={{ color: TOPIC_COLORS[word.topic] || 'var(--muted)', borderColor: TOPIC_COLORS[word.topic] + '40' }}>
              {word.topic}
            </span>
            <span className="tag">{word.difficulty}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--muted)' }}>{word.chineseMeaning}</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>{word.englishDefinition}</div>
          {word.businessExamples?.[0] && (
            <div style={{
              marginTop: 10, fontSize: 13, color: 'var(--text)',
              background: 'var(--surface2)', borderRadius: 6,
              padding: '7px 12px', borderLeft: '3px solid var(--accent2)',
            }}>
              <span style={{ color: 'var(--accent2)', fontWeight: 600, marginRight: 6 }}>e.g.</span>
              {word.businessExamples[0]}
            </div>
          )}
          {/* Tags row */}
          {(onUpdateTags || (word.tags && word.tags.length > 0)) && (
            <div style={{ marginTop: 8 }}>
              <TagEditor tags={word.tags ?? []} onChange={onUpdateTags} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {onToggleStar && (
            <button
              onClick={onToggleStar}
              title={word.highlighted ? 'Remove from priority' : 'Mark as priority'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: word.highlighted ? '#eab308' : 'var(--muted)', padding: 2 }}
            >
              <Star size={15} fill={word.highlighted ? 'currentColor' : 'none'} />
            </button>
          )}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <Trash2 size={16} />
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Business Examples</div>
            {word.businessExamples.map((ex, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ color: 'var(--accent2)', fontSize: 12, marginTop: 3, flexShrink: 0 }}>▸</span>
                <span style={{ fontSize: 14 }}>{ex}</span>
                <button onClick={() => speak(ex)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, flexShrink: 0 }}>
                  {ttsText === ex && ttsState === 'playing' ? <Pause size={12} /> : <Volume2 size={12} />}
                </button>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Alternative Expressions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {word.alternatives.map((alt, i) => (
                <div key={i} className="card-sm" style={{ fontSize: 13 }}>
                  <span className="tag-accent" style={{ marginRight: 6 }}>{alt.style}</span>
                  {alt.expression}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Common Collocations</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {word.collocations.map((c, i) => (
                <span key={i} className="tag-accent">{c}</span>
              ))}
            </div>
          </div>

          {word.wordRoot && (
            <WordStructureBlock wordRoot={word.wordRoot} relatedWords={word.relatedWords} />
          )}
        </div>
      )}
    </div>
  )
}

export default function VocabularyPage() {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState<'english' | 'chinese'>('english')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [words, setWords] = useState<VocabWord[]>([])
  const [filterTopic, setFilterTopic]         = useState('all')
  const [filterHighlighted, setFilterHighlighted] = useState(false)
  const [filterTag, setFilterTag]             = useState('')
  const [search, setSearch]                   = useState('')
  const [newCard, setNewCard]                 = useState<VocabWord | null>(null)
  const [streaming, setStreaming]             = useState<Partial_VocabWord | null>(null)

  useEffect(() => { setWords(vocabStore.getAll()) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setNewCard(null)
    setStreaming(null)
    const savedInput = input.trim()
    setInput('')
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: savedInput, inputType }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to generate vocabulary card' }))
        throw new Error(errData.error ?? 'Failed to generate vocabulary card')
      }
      if (!res.body) throw new Error('Failed to generate vocabulary card')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      // Stream in chunks, progressively showing fields as they arrive
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreaming(extractPartial(accumulated))
      }
      // Flush any remaining bytes held by the decoder
      accumulated += decoder.decode()

      // Extract the JSON object robustly — handles markdown fences and
      // any preamble/postamble Gemini may add around the JSON
      const data = JSON.parse(cleanJSON(accumulated))

      const word: VocabWord = {
        id: crypto.randomUUID(),
        input: savedInput,
        inputType,
        ...data,
        createdAt: Date.now(),
        nextReview: Date.now() + 24 * 60 * 60 * 1000,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        favorited: false,
      }
      vocabStore.add(word)
      statsStore.addXP(10)
      setWords(vocabStore.getAll())
      setNewCard(word)
      setStreaming(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStreaming(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = useCallback((id: string) => {
    vocabStore.remove(id)
    setWords(vocabStore.getAll())
    if (newCard?.id === id) setNewCard(null)
  }, [newCard])

  const handleToggleStar = useCallback((id: string) => {
    const word = vocabStore.getAll().find(w => w.id === id)
    if (!word) return
    vocabStore.update(id, { highlighted: !word.highlighted })
    setWords(vocabStore.getAll())
    if (newCard?.id === id) setNewCard(v => v ? { ...v, highlighted: !v.highlighted } : v)
  }, [newCard])

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    vocabStore.update(id, { tags })
    setWords(vocabStore.getAll())
    if (newCard?.id === id) setNewCard(v => v ? { ...v, tags } : v)
  }, [newCard])

  const filtered = words.filter(w => {
    if (filterTopic !== 'all' && w.topic !== filterTopic) return false
    if (filterHighlighted && !w.highlighted) return false
    if (filterTag && !(w.tags ?? []).includes(filterTag)) return false
    if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.chineseMeaning.includes(search)) return false
    return true
  })

  const topics  = ['all', ...Array.from(new Set(words.map(w => w.topic)))]
  const allTags = Array.from(new Set(words.flatMap(w => w.tags ?? []))).sort()

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 900 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Vocabulary</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>Search any English word or Chinese business term to get a full learning card.</p>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => setInputType('english')}
              className={inputType === 'english' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 14px', fontSize: 13 }}>
              English
            </button>
            <button type="button" onClick={() => setInputType('chinese')}
              className={inputType === 'chinese' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 14px', fontSize: 13 }}>
              中文
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder={inputType === 'english' ? 'e.g. synergy, leverage, stakeholder…' : 'e.g. 降本增效, 协同效应…'}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={loading || !input.trim()}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? 'Analyzing…' : 'Learn'}
            </button>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </form>

        {/* Streaming preview — appears field-by-field as Gemini responds */}
        {streaming && (
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(59,111,212,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Loader2 size={13} style={{ color: 'var(--accent2)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1 }}>Generating…</span>
            </div>

            {streaming.word && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{streaming.word}</span>
                {streaming.ipa && <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{streaming.ipa}</span>}
                {streaming.topic && <span className="tag">{streaming.topic}</span>}
                {streaming.difficulty && <span className="tag">{streaming.difficulty}</span>}
              </div>
            )}
            {streaming.chineseMeaning && (
              <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>{streaming.chineseMeaning}</div>
            )}
            {streaming.englishDefinition && (
              <div style={{ fontSize: 14, marginBottom: 10 }}>{streaming.englishDefinition}</div>
            )}
            {streaming.collocations && streaming.collocations.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {streaming.collocations.map((c, i) => <span key={i} className="tag-accent">{c}</span>)}
              </div>
            )}
            {streaming.businessExamples && streaming.businessExamples.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {streaming.businessExamples.map((ex, i) => (
                  <div key={i} style={{ fontSize: 13, background: 'var(--surface2)', borderRadius: 6, padding: '7px 12px', marginBottom: 6 }}>
                    <span style={{ color: 'var(--accent2)' }}>▸</span> {ex}
                  </div>
                ))}
              </div>
            )}
            {streaming.wordRoot && (
              <div style={{ marginTop: 10 }}>
                <WordStructureBlock wordRoot={streaming.wordRoot} relatedWords={streaming.relatedWords ?? []} />
              </div>
            )}
          </div>
        )}

        {/* Completed new card — auto-saved with cancel option */}
        {newCard && !streaming && (
          <div style={{ marginBottom: 24 }}>
            {/* Save status bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              borderBottom: 'none', borderRadius: '10px 10px 0 0',
              padding: '8px 14px',
            }}>
              <span style={{ fontSize: 13, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <CheckCircle2 size={14} />
                Auto-saved to your library
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => handleToggleStar(newCard.id)}
                  title={newCard.highlighted ? 'Remove from priority' : 'Mark as priority — reviewed 2× more often'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: `1px solid ${newCard.highlighted ? '#eab308' : 'rgba(234,179,8,0.4)'}`,
                    borderRadius: 6, padding: '3px 10px',
                    fontSize: 12, color: newCard.highlighted ? '#eab308' : 'var(--muted)', cursor: 'pointer',
                  }}
                >
                  <Star size={12} fill={newCard.highlighted ? 'currentColor' : 'none'} />
                  {newCard.highlighted ? 'Starred' : 'Star it'}
                </button>
                <button
                  onClick={() => handleDelete(newCard.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 6, padding: '3px 10px',
                    fontSize: 12, color: '#ef4444', cursor: 'pointer',
                  }}
                >
                  <X size={12} /> Cancel save
                </button>
              </div>
            </div>
            {/* Card — top corners flattened to connect with the banner */}
            <div style={{ borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              <VocabCard word={{ ...newCard }} onDelete={() => handleDelete(newCard.id)} onUpdateTags={(tags) => handleUpdateTags(newCard.id, tags)} />
            </div>
            {/* Continue the learning loop */}
            <NextSteps steps={[
              { href: `/daily?text=${encodeURIComponent(newCard.word)}`, label: 'Use it in a sentence', icon: MessageCircle, color: '#5b5bd6' },
              { href: '/pronunciation', label: 'Pronounce it', icon: Mic, color: '#22c55e' },
              { href: '/review', label: 'Review later', icon: RotateCcw, color: '#eab308' },
            ]} />
          </div>
        )}

        {/* Library */}
        {words.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <input className="input" placeholder="Search library…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterHighlighted(f => !f)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${filterHighlighted ? '#eab308' : 'var(--border)'}`,
                    background: filterHighlighted ? 'rgba(234,179,8,0.12)' : 'var(--surface2)',
                    color: filterHighlighted ? '#eab308' : 'var(--muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <Star size={11} fill={filterHighlighted ? 'currentColor' : 'none'} /> Starred
                </button>
                {topics.map(t => (
                  <button key={t} onClick={() => setFilterTopic(t)}
                    style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)',
                      background: filterTopic === t ? 'var(--accent)' : 'var(--surface2)',
                      color: filterTopic === t ? 'white' : 'var(--muted)', cursor: 'pointer',
                    }}>
                    {t}
                  </button>
                ))}
                {/* Custom tag filters */}
                {allTags.length > 0 && (
                  <>
                    <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', padding: '0 4px' }}>|</span>
                    {allTags.map(tag => (
                      <button key={tag} onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          border: `1px solid ${filterTag === tag ? 'rgba(167,139,250,0.5)' : 'var(--border)'}`,
                          background: filterTag === tag ? 'rgba(167,139,250,0.12)' : 'var(--surface2)',
                          color: filterTag === tag ? '#a78bfa' : 'var(--muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        <Tag size={10} /> #{tag}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{filtered.length} words</div>
            {filtered.map(word => (
              <VocabCard key={word.id} word={word} onDelete={() => handleDelete(word.id)} onToggleStar={() => handleToggleStar(word.id)} onUpdateTags={(tags) => handleUpdateTags(word.id, tags)} />
            ))}
          </>
        )}

        {words.length === 0 && !newCard && !streaming && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Your vocabulary library is empty</div>
            <div style={{ fontSize: 14 }}>Search for a word above to get started</div>
          </div>
        )}
      </main>
    </div>
  )
}
