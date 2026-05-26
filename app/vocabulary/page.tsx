'use client'
import { useState, useEffect, useCallback } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, statsStore } from '@/lib/storage'
import type { VocabWord } from '@/types'
import { Search, Loader2, Volume2, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { speak } from '@/lib/tts'

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
    const m = raw.match(/"wordRoot"\s*:\s*\{([^}]*)\}/)
    if (!m) return undefined
    const block = m[1]
    const root    = block.match(/"root"\s*:\s*"([^"]+)"/)
    const origin  = block.match(/"origin"\s*:\s*"([^"]+)"/)
    const meaning = block.match(/"meaning"\s*:\s*"([^"]+)"/)
    if (!root || !origin || !meaning) return undefined
    return { root: root[1], origin: origin[1], meaning: meaning[1] }
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

const TOPIC_COLORS: Record<string, string> = {
  strategy: '#6c63ff', finance: '#22c55e', operations: '#f97316',
  communication: '#a78bfa', leadership: '#eab308', general: '#7070a0',
}


function VocabCard({ word, onDelete, onFavorite }: { word: VocabWord; onDelete: () => void; onFavorite: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{word.word}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{word.ipa}</span>
            <button onClick={() => speak(word.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
              <Volume2 size={14} />
            </button>
            <span className="tag" style={{ color: TOPIC_COLORS[word.topic] || 'var(--muted)', borderColor: TOPIC_COLORS[word.topic] + '40' }}>
              {word.topic}
            </span>
            <span className="tag">{word.difficulty}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--muted)' }}>{word.chineseMeaning}</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>{word.englishDefinition}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer', color: word.favorited ? '#eab308' : 'var(--muted)' }}>
            <Star size={16} fill={word.favorited ? '#eab308' : 'none'} />
          </button>
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
                  <Volume2 size={12} />
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
            <div style={{
              background: 'rgba(167,139,250,0.07)',
              border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 8, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Word Root
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent2)' }}>
                  {word.wordRoot.root}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {word.wordRoot.origin}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: word.relatedWords?.length ? 12 : 0 }}>
                "{word.wordRoot.meaning}"
              </div>
              {word.relatedWords && word.relatedWords.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Words sharing this root</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {word.relatedWords.map((w, i) => (
                      <button key={i} onClick={() => speak(w)}
                        style={{
                          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
                          borderRadius: 5, padding: '3px 10px', fontSize: 13, color: 'var(--accent2)',
                          cursor: 'pointer', fontWeight: 500,
                        }}>
                        {w}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
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
  const [filterTopic, setFilterTopic] = useState('all')
  const [search, setSearch] = useState('')
  const [newCard, setNewCard] = useState<VocabWord | null>(null)
  const [streaming, setStreaming] = useState<Partial_VocabWord | null>(null)

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
      if (!res.ok || !res.body) throw new Error('Failed to generate vocabulary card')

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
      const start = accumulated.indexOf('{')
      const end   = accumulated.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('Failed to generate vocabulary card')
      const data = JSON.parse(accumulated.slice(start, end + 1))

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

  const handleFavorite = useCallback((id: string) => {
    const w = words.find(w => w.id === id)
    if (!w) return
    vocabStore.update(id, { favorited: !w.favorited })
    setWords(vocabStore.getAll())
  }, [words])

  const filtered = words.filter(w => {
    if (filterTopic !== 'all' && w.topic !== filterTopic) return false
    if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.chineseMeaning.includes(search)) return false
    return true
  })

  const topics = ['all', ...Array.from(new Set(words.map(w => w.topic)))]

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
          <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(108,99,255,0.4)' }}>
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
              <div style={{ marginTop: 10, background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Word Root</div>
                <span style={{ fontWeight: 700, color: 'var(--accent2)', marginRight: 8 }}>{streaming.wordRoot.root}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{streaming.wordRoot.origin} · "{streaming.wordRoot.meaning}"</span>
                {streaming.relatedWords && streaming.relatedWords.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {streaming.relatedWords.map((w, i) => (
                      <span key={i} style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: 12, color: 'var(--accent2)' }}>{w}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Completed new card */}
        {newCard && !streaming && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Just learned</div>
            <VocabCard word={{ ...newCard }} onDelete={() => handleDelete(newCard.id)} onFavorite={() => handleFavorite(newCard.id)} />
          </div>
        )}

        {/* Library */}
        {words.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <input className="input" placeholder="Search library…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
              <div style={{ display: 'flex', gap: 6 }}>
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
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{filtered.length} words</div>
            {filtered.map(word => (
              <VocabCard key={word.id} word={word} onDelete={() => handleDelete(word.id)} onFavorite={() => handleFavorite(word.id)} />
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
