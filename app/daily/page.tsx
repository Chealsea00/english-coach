'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { Volume2, Pause, Loader2, ChevronRight, Mic2, CheckCircle2, X, Star, Mic, BookOpen, RotateCcw } from 'lucide-react'
import TagEditor from '@/components/TagEditor'
import NextSteps from '@/components/NextSteps'
import { speak } from '@/lib/tts'
import { useTTS } from '@/lib/useTTS'
import { cleanJSON } from '@/lib/clean-json'
import { dailySentenceStore } from '@/lib/storage'
import { TOPIC_COLORS } from '@/lib/topics'
import type { DailySentence } from '@/types'

type KeyPhrase = { phrase: string; meaning: string; chineseMeaning: string }

type Analysis = {
  englishText?: string
  chineseTranslation: string
  tone: string
  register: string
  keyPhrases: KeyPhrase[]
  stressedWords: string[]
  naturalTips: string[]
  pronunciationNote: string
  topic?: string
}

// ── Progressive extraction from partial JSON stream ───────────────────────────
function extractPartial(raw: string): Partial<Analysis> {
  const str = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'))
    return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : undefined
  }
  const strArr = (key: string) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`))
    if (!m) return undefined
    return [...m[1].matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)].map(x => x[1])
  }
  const keyPhrases = (): KeyPhrase[] | undefined => {
    const m = raw.match(/"keyPhrases"\s*:\s*\[([\s\S]*?)(?:\]|$)/)
    if (!m) return undefined
    const items: KeyPhrase[] = []
    const block = m[1]
    const phraseMs  = [...block.matchAll(/"phrase"\s*:\s*"([^"]+)"/g)]
    const meaningMs = [...block.matchAll(/"meaning"\s*:\s*"([^"]+)"/g)]
    const chineseMs = [...block.matchAll(/"chineseMeaning"\s*:\s*"([^"]+)"/g)]
    phraseMs.forEach((pm, i) => {
      if (meaningMs[i]) items.push({
        phrase: pm[1],
        meaning: meaningMs[i][1],
        chineseMeaning: chineseMs[i]?.[1] ?? '',
      })
    })
    return items.length ? items : undefined
  }

  return {
    englishText:        str('englishText'),
    chineseTranslation: str('chineseTranslation'),
    tone:               str('tone'),
    register:           str('register'),
    keyPhrases:         keyPhrases(),
    stressedWords:      strArr('stressedWords'),
    naturalTips:        strArr('naturalTips'),
    pronunciationNote:  str('pronunciationNote'),
    topic:              str('topic'),
  }
}

const REGISTER_COLOR: Record<string, string> = {
  informal:     '#f97316',
  'semi-formal':'#3b82f6',
  formal:       '#6c63ff',
}

const EXAMPLES = [
  "Is it just me who thinks the staff member at Bowl'd today was being extremely rude? If asking for no sauce on the bowl is too much at least I'd expect a nicer attitude. Genuinely I felt scolded at and disrespected.",
  "Can we circle back on this after the standup? I want to make sure we're aligned before we loop in the broader team.",
  "Honestly, I'm burnt out. I've been pulling late nights for two weeks straight and no one even acknowledged it.",
  "Just wanted to ping you — any update on the deck? The client call is in 30 and I want to make sure we're good to go.",
]

export default function DailyPage() {
  const [input, setInput]       = useState('')
  const [inputType, setInputType] = useState<'english' | 'chinese'>('english')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [partial, setPartial]         = useState<Partial<Analysis> | null>(null)
  const [result, setResult]           = useState<Analysis | null>(null)
  const [savedId, setSavedId]           = useState<string | null>(null)
  const [highlighted, setHighlighted]   = useState(false)
  const [tags, setTags]                 = useState<string[]>([])
  const { ttsState, ttsText, ttsRate } = useTTS()

  // Prefill from ?text= (e.g. "Use it in a sentence" from the vocabulary loop)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('text')
    if (t) setInput(t)
  }, [])

  // Helper: render a Listen button with pause/resume support
  const ListenButton = ({ label, text, rate }: { label: string; text: string; rate: number }) => {
    const trimmed    = text.trim()
    const isActive   = ttsText === trimmed && ttsRate === rate
    const isLoading  = isActive && ttsState === 'loading'
    const isPlaying  = isActive && ttsState === 'playing'
    const isPaused   = isActive && ttsState === 'paused'
    return (
      <button
        className="btn-secondary"
        onClick={() => speak(trimmed, rate)}
        disabled={!trimmed}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {isLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> :
         isPlaying  ? <Pause   size={15} /> :
                      <Volume2 size={15} />}
        {isLoading ? 'Loading…' : isPlaying ? 'Pause' : isPaused ? 'Resume' : label}
      </button>
    )
  }

  const analyse = async (text: string) => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setPartial(null)
    setResult(null)
    setSavedId(null)
    setHighlighted(false)
    setTags([])

    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), inputType }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Analysis failed' }))
        throw new Error(errData.error ?? 'Analysis failed')
      }
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setPartial(extractPartial(accumulated))
      }
      accumulated += decoder.decode()

      const data = JSON.parse(cleanJSON(accumulated)) as Analysis
      setResult(data)
      setPartial(null)

      const learnedText = inputType === 'chinese' ? (data.englishText ?? '').trim() : text.trim()
      const chineseRef   = inputType === 'chinese' ? text.trim() : (data.chineseTranslation ?? '')

      // Auto-save to library
      const sentence: DailySentence = {
        id: crypto.randomUUID(),
        text: learnedText,
        inputType,
        chineseTranslation: chineseRef,
        tone:               data.tone ?? '',
        register:           data.register ?? '',
        topic:              data.topic ?? 'general',
        keyPhrases:         data.keyPhrases ?? [],
        stressedWords:      data.stressedWords ?? [],
        naturalTips:        data.naturalTips ?? [],
        pronunciationNote:  data.pronunciationNote ?? '',
        createdAt:   Date.now(),
        nextReview:  Date.now() + 24 * 60 * 60 * 1000,
        interval:    1,
        repetitions: 0,
        easeFactor:  2.5,
      }
      dailySentenceStore.add(sentence)
      setSavedId(sentence.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const display = result ?? partial
  const learnText = inputType === 'chinese' ? (display?.englishText ?? '').trim() : input.trim()

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 820 }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Daily Sentences</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
          Paste any sentence — casual, venting, conversational — and learn how to understand and say it naturally.
        </p>

        {/* Input card */}
        <div className="card" style={{ marginBottom: 24 }}>
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
          <textarea
            className="input"
            placeholder={inputType === 'english'
              ? 'Paste a sentence or paragraph you want to understand…'
              : '用中文描述你想表达的意思，我们帮你转换成地道的英文表达…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
            style={{ resize: 'vertical', fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={() => analyse(input)}
              disabled={loading || !input.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic2 size={15} />}
              {loading ? 'Analysing…' : 'Analyse'}
            </button>
            {inputType === 'english' && input.trim() && <ListenButton label="Listen (slow)"   text={input} rate={0.85} />}
            {inputType === 'english' && input.trim() && <ListenButton label="Listen (normal)" text={input} rate={1.0}  />}
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 10 }}>{error}</div>}
        </div>

        {/* Try an example */}
        {!display && !loading && inputType === 'english' && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>
              Try an example
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => { setInput(ex); analyse(ex) }}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 14px', fontSize: 13,
                    color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                    lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                  <ChevronRight size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {ex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-save banner */}
        {savedId && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <CheckCircle2 size={14} /> Auto-saved to your library
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => {
                  const next = !highlighted
                  setHighlighted(next)
                  if (savedId) dailySentenceStore.update(savedId, { highlighted: next })
                }}
                title={highlighted ? 'Remove from priority' : 'Mark as priority — reviewed 2× more often'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: `1px solid ${highlighted ? '#eab308' : 'rgba(234,179,8,0.4)'}`,
                  borderRadius: 6, padding: '3px 10px',
                  fontSize: 12, color: highlighted ? '#eab308' : 'var(--muted)', cursor: 'pointer',
                }}
              >
                <Star size={12} fill={highlighted ? 'currentColor' : 'none'} />
                {highlighted ? 'Starred' : 'Star it'}
              </button>
              <button
                onClick={() => { dailySentenceStore.remove(savedId); setSavedId(null) }}
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
            {/* Tag row */}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(34,197,94,0.15)', width: '100%' }}>
              <TagEditor
                tags={tags}
                onChange={(next) => {
                  setTags(next)
                  if (savedId) dailySentenceStore.update(savedId, { tags: next })
                }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {display && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Translation + tone */}
            {inputType === 'chinese' ? (
              (display.englishText || display.tone) && (
                <div className="card">
                  {display.englishText && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Say It In English
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.65, color: 'var(--text)', marginBottom: 12 }}>
                        {display.englishText}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <ListenButton label="Listen (slow)"   text={display.englishText} rate={0.85} />
                        <ListenButton label="Listen (normal)" text={display.englishText} rate={1.0}  />
                      </div>
                    </>
                  )}
                  {display.tone && (
                    <div style={{
                      display: 'flex', gap: 8, flexWrap: 'wrap',
                      paddingTop: display.englishText ? 14 : 0,
                      borderTop: display.englishText ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
                        background: 'rgba(59,111,212,0.1)', color: 'var(--accent)',
                        border: '1px solid rgba(59,111,212,0.25)',
                      }}>
                        🎭 {display.tone}
                      </span>
                      {display.register && (
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
                          background: 'rgba(0,0,0,0.04)', color: REGISTER_COLOR[display.register] ?? 'var(--muted)',
                          border: `1px solid ${REGISTER_COLOR[display.register] ?? 'var(--border)'}40`,
                        }}>
                          {display.register}
                        </span>
                      )}
                      {display.topic && (
                        <span className="tag" style={{
                          color: TOPIC_COLORS[display.topic] || 'var(--muted)',
                          borderColor: (TOPIC_COLORS[display.topic] || '#7070a0') + '50',
                        }}>
                          {display.topic}
                        </span>
                      )}
                      {!result && <span style={{ fontSize: 12, color: 'var(--muted)' }}>analysing…</span>}
                    </div>
                  )}
                  {/* Reference: original Chinese input */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      Your Original (中文)
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{input.trim()}</div>
                  </div>
                </div>
              )
            ) : (
              (display.chineseTranslation || display.tone) && (
                <div className="card">
                  {display.tone && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
                        background: 'rgba(59,111,212,0.1)', color: 'var(--accent)',
                        border: '1px solid rgba(59,111,212,0.25)',
                      }}>
                        🎭 {display.tone}
                      </span>
                      {display.register && (
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
                          background: 'rgba(0,0,0,0.04)', color: REGISTER_COLOR[display.register] ?? 'var(--muted)',
                          border: `1px solid ${REGISTER_COLOR[display.register] ?? 'var(--border)'}40`,
                        }}>
                          {display.register}
                        </span>
                      )}
                      {display.topic && (
                        <span className="tag" style={{
                          color: TOPIC_COLORS[display.topic] || 'var(--muted)',
                          borderColor: (TOPIC_COLORS[display.topic] || '#7070a0') + '50',
                        }}>
                          {display.topic}
                        </span>
                      )}
                      {!result && <span style={{ fontSize: 12, color: 'var(--muted)' }}>analysing…</span>}
                    </div>
                  )}
                  {display.chineseTranslation && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Chinese Translation
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text)' }}>
                        {display.chineseTranslation}
                      </div>
                    </>
                  )}
                </div>
              )
            )}

            {/* Key phrases */}
            {display.keyPhrases && display.keyPhrases.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  Key Phrases &amp; Expressions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {display.keyPhrases.map((kp, i) => (
                    <div key={i} style={{
                      background: 'var(--surface2)', borderRadius: 8,
                      padding: '12px 14px', borderLeft: '3px solid var(--accent)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          &ldquo;{kp.phrase}&rdquo;
                        </span>
                        <button onClick={() => speak(kp.phrase)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
                          {ttsText === kp.phrase && ttsState === 'playing' ? <Pause size={13} /> : <Volume2 size={13} />}
                        </button>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{kp.meaning}</div>
                      {kp.chineseMeaning && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{kp.chineseMeaning}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pronunciation */}
            {(display.stressedWords?.length || display.naturalTips?.length || display.pronunciationNote) && (
              <div className="card" style={{
                background: 'rgba(59,111,212,0.05)',
                border: '1px solid rgba(59,111,212,0.2)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  🗣 How to Say It Naturally
                </div>

                {display.pronunciationNote && (
                  <div style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 14, color: 'var(--text)' }}>
                    {display.pronunciationNote}
                  </div>
                )}

                {display.stressedWords && display.stressedWords.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Stress these words</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {display.stressedWords.map((w, i) => (
                        <span key={i} style={{
                          background: 'rgba(59,111,212,0.12)',
                          border: '1px solid rgba(59,111,212,0.3)',
                          borderRadius: 5, padding: '3px 10px',
                          fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                        }}>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {display.naturalTips && display.naturalTips.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Tips for natural speech</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {display.naturalTips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                            background: 'rgba(59,111,212,0.12)', borderRadius: 4,
                            padding: '1px 6px', flexShrink: 0, marginTop: 1,
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)' }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listen again buttons */}
                {result && learnText && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(59,111,212,0.15)' }}>
                    <ListenButton label="Listen (slow)"   text={learnText} rate={0.85} />
                    <ListenButton label="Listen (normal)" text={learnText} rate={1.0}  />
                  </div>
                )}
              </div>
            )}

            {/* Continue the learning loop */}
            {result && (
              <NextSteps steps={[
                { href: '/pronunciation', label: 'Pronounce it', icon: Mic, color: '#22c55e' },
                { href: '/review', label: 'Review later', icon: RotateCcw, color: '#eab308' },
                { href: '/vocabulary', label: 'Learn a new word', icon: BookOpen, color: '#5b5bd6' },
              ]} />
            )}

          </div>
        )}
      </main>
    </div>
  )
}
