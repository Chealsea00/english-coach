'use client'
import { useState, useEffect, useCallback } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, statsStore } from '@/lib/storage'
import type { VocabWord } from '@/types'
import { Search, Loader2, Volume2, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const TOPIC_COLORS: Record<string, string> = {
  strategy: '#6c63ff', finance: '#22c55e', operations: '#f97316',
  communication: '#a78bfa', leadership: '#eab308', general: '#7070a0',
}

function speak(text: string) {
  if (typeof window === 'undefined') return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
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

  useEffect(() => { setWords(vocabStore.getAll()) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setNewCard(null)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), inputType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const word: VocabWord = {
        id: crypto.randomUUID(),
        input: input.trim(),
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
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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

        {/* New card result */}
        {newCard && (
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

        {words.length === 0 && !newCard && (
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
