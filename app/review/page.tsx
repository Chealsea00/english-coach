'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, passageStore, statsStore } from '@/lib/storage'
import { sm2, isDue } from '@/lib/spaced-repetition'
import type { VocabWord, Passage } from '@/types'
import { Volume2, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import { speak } from '@/lib/tts'

type CardItem =
  | { kind: 'vocab';    data: VocabWord; mode: 'meaning' | 'chinese-to-english' }
  | { kind: 'passage';  data: Passage }


function buildQueue(): CardItem[] {
  const vocab   = vocabStore.getAll().filter(w => isDue(w.nextReview))
  const passages = passageStore.getAll().filter(p => isDue(p.nextReview))
  const items: CardItem[] = [
    ...vocab.flatMap(w => [
      { kind: 'vocab' as const, data: w, mode: 'meaning' as const },
      { kind: 'vocab' as const, data: w, mode: 'chinese-to-english' as const },
    ]),
    ...passages.map(p => ({ kind: 'passage' as const, data: p })),
  ]
  return items.sort(() => Math.random() - 0.5)
}

// ─── Vocab Card ───────────────────────────────────────────────────────────────

function VocabCard({ item }: { item: Extract<CardItem, { kind: 'vocab' }> }) {
  const [revealed, setRevealed] = useState(false)
  const w = item.data
  return (
    <div>
      {item.mode === 'meaning' ? (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>What does this word mean?</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>{w.word}</div>
          <div style={{ fontSize: 15, color: 'var(--muted)', fontFamily: 'monospace', marginBottom: 20 }}>{w.ipa}</div>
          <button onClick={() => speak(w.word, 0.85)} className="btn-secondary" style={{ marginBottom: 24 }}>
            <Volume2 size={14} /> Pronounce
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Translate to English</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>{w.chineseMeaning}</div>
        </>
      )}

      {!revealed ? (
        <button className="btn-secondary" onClick={() => setRevealed(true)}>Show Answer</button>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          {item.mode === 'meaning' ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{w.englishDefinition}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{w.chineseMeaning}</div>
              {w.businessExamples.slice(0, 2).map((ex, i) => (
                <div key={i} style={{ fontSize: 13, background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ color: 'var(--accent2)' }}>▸</span> {ex}
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent2)' }}>{w.word}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Passage Card ─────────────────────────────────────────────────────────────

function PassageReviewCard({ item }: { item: Extract<CardItem, { kind: 'passage' }> }) {
  const [revealed, setRevealed] = useState(false)
  const p = item.data
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
        Recall this passage's key phrases
      </div>
      {p.sourceLabel && (
        <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600, marginBottom: 8 }}>
          {p.sourceLabel}
        </div>
      )}
      <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16, color: 'var(--text)' }}>
        {p.text.length > 300 ? p.text.slice(0, 300) + '…' : p.text}
      </div>
      <button onClick={() => speak(p.text, 0.85)} className="btn-secondary" style={{ marginBottom: 20 }}>
        <Volume2 size={14} /> Listen
      </button>

      {!revealed ? (
        <button className="btn-secondary" onClick={() => setRevealed(true)}>Show Key Phrases</button>
      ) : (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Key Phrases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.keyPhrases.slice(0, 5).map((kp, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px' }}>
                <span style={{ color: 'var(--accent2)', fontWeight: 600, fontSize: 13 }}>{kp.phrase}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>— {kp.chineseMeaning}</span>
              </div>
            ))}
          </div>
          {p.pronunciationFocus && (
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              💡 {p.pronunciationFocus}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [queue, setQueue] = useState<CardItem[]>([])
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState({ correct: 0, hard: 0, wrong: 0 })
  const [started, setStarted] = useState(false)

  const totalDue = (() => {
    const v = vocabStore.getAll().filter(w => isDue(w.nextReview)).length
    const p = passageStore.getAll().filter(p => isDue(p.nextReview)).length
    return v + p
  })()

  const startSession = () => {
    setQueue(buildQueue())
    setIndex(0)
    setDone(false)
    setResults({ correct: 0, hard: 0, wrong: 0 })
    setStarted(true)
  }

  const grade = (quality: 0 | 3 | 5) => {
    const card = queue[index]
    if (!card) return

    if (card.kind === 'vocab') {
      const w = card.data
      const next = sm2(quality, w.repetitions, w.easeFactor, w.interval)
      vocabStore.update(w.id, { interval: next.nextInterval, repetitions: next.nextRepetitions, easeFactor: next.nextEaseFactor, nextReview: next.nextReview })
    } else {
      const p = card.data
      const next = sm2(quality, p.repetitions, p.easeFactor, p.interval)
      passageStore.update(p.id, { interval: next.nextInterval, repetitions: next.nextRepetitions, easeFactor: next.nextEaseFactor, nextReview: next.nextReview })
    }

    setResults(r => ({
      correct: quality === 5 ? r.correct + 1 : r.correct,
      hard:    quality === 3 ? r.hard + 1    : r.hard,
      wrong:   quality === 0 ? r.wrong + 1   : r.wrong,
    }))

    if (index + 1 >= queue.length) {
      statsStore.update({ reviewsCompleted: statsStore.get().reviewsCompleted + queue.length })
      statsStore.addXP(queue.length * 5)
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  // ── Not started ──
  if (!started) {
    return (
      <div style={{ display: 'flex' }}>
        <Nav />
        <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 700 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Spaced Repetition Review</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 36 }}>
            Review at the optimal moment to maximise long-term retention.
          </p>
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            {totalDue > 0 ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{totalDue} cards due</div>
                <div style={{ color: 'var(--muted)', marginBottom: 28 }}>Ready when you are</div>
                <button className="btn-primary" onClick={startSession} style={{ fontSize: 16, padding: '12px 32px' }}>
                  Start Review Session
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>All caught up!</div>
                <div style={{ color: 'var(--muted)' }}>
                  No cards due. Save vocabulary or passages to build your review queue.
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── Done ──
  if (done) {
    const total = results.correct + results.hard + results.wrong
    const pct = total > 0 ? Math.round((results.correct / total) * 100) : 0
    return (
      <div style={{ display: 'flex' }}>
        <Nav />
        <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 700 }}>
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <Trophy size={48} style={{ color: '#eab308', marginBottom: 16 }} />
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Session Complete!</div>
            <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 24, color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444' }}>
              {pct}%
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32 }}>
              {[
                { label: 'Easy', value: results.correct, color: '#22c55e' },
                { label: 'Hard', value: results.hard,    color: '#eab308' },
                { label: 'Missed', value: results.wrong, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn-primary" onClick={startSession}>Review Again</button>
              <button className="btn-secondary" onClick={() => setStarted(false)}>Done</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── In session ──
  const card = queue[index]
  const progress = (index / queue.length) * 100

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 700 }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{index + 1} / {queue.length}</div>
        </div>

        <div className="card" style={{ minHeight: 360 }}>
          {/* Card type badge + skip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span className={card.kind === 'vocab' ? 'tag-accent' : 'tag'}>
              {card.kind === 'vocab' ? 'Vocabulary' : 'Passage'}
            </span>
            <button onClick={() => grade(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>
              Skip
            </button>
          </div>

          {card.kind === 'vocab'
            ? <VocabCard key={`${card.data.id}-${card.mode}-${index}`} item={card} />
            : <PassageReviewCard key={`${card.data.id}-${index}`} item={card} />
          }

          {/* Grading buttons */}
          <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>How well did you know this?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: 'Again', icon: XCircle,      quality: 0 as const, bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444' },
                { label: 'Hard',  icon: Clock,         quality: 3 as const, bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.3)',  color: '#eab308' },
                { label: 'Easy',  icon: CheckCircle,   quality: 5 as const, bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  color: '#22c55e' },
              ].map(({ label, icon: Icon, quality, bg, border, color }) => (
                <button key={label} onClick={() => grade(quality)} style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: `1px solid ${border}`, background: bg, color,
                  cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
