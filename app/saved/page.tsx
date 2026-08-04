'use client'
import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, passageStore, dailySentenceStore } from '@/lib/storage'
import type { VocabWord, Passage, DailySentence } from '@/types'
import { Search, Trash2, ChevronDown, ChevronUp, Volume2, Pause, RefreshCw, CheckCircle2, Star, Download, Upload, Tag } from 'lucide-react'
import TagEditor from '@/components/TagEditor'
import { speak } from '@/lib/tts'
import { useTTS } from '@/lib/useTTS'
import { TOPIC_COLORS } from '@/lib/topics'

// ─── Mastery helpers ──────────────────────────────────────────────────────────
type Mastery = 'new' | 'learning' | 'familiar' | 'mastered'

function getMastery(item: { interval: number; repetitions: number }): Mastery {
  if (item.interval >= 21) return 'mastered'
  if (item.interval >= 7)  return 'familiar'
  if (item.repetitions > 0) return 'learning'
  return 'new'
}

const MASTERY_META: Record<Mastery, { label: string; color: string; bg: string }> = {
  new:      { label: 'New',      color: '#7070a0', bg: 'rgba(112,112,160,0.12)' },
  learning: { label: 'Learning', color: '#eab308', bg: 'rgba(234,179,8,0.12)'   },
  familiar: { label: 'Familiar', color: '#6c63ff', bg: 'rgba(59,111,212,0.12)'  },
  mastered: { label: 'Mastered', color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
}

// ─── Word Structure block ─────────────────────────────────────────────────────
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
                borderRadius: 5, padding: '3px 10px', fontSize: 12, color: 'var(--accent2)',
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

// ─── VocabCard ────────────────────────────────────────────────────────────────
function VocabCard({ word, onDelete, onToggleStar, onUpdateTags }: {
  word: VocabWord
  onDelete: () => void
  onToggleStar: () => void
  onUpdateTags: (tags: string[]) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const mastery = getMastery(word)
  const ms = MASTERY_META[mastery]
  const { ttsState, ttsText } = useTTS()

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{word.word}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{word.ipa}</span>
            <button onClick={() => speak(word.word)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
              {ttsText === word.word && ttsState === 'playing' ? <Pause size={13} /> : <Volume2 size={13} />}
            </button>
            {word.topic && (
              <span className="tag" style={{
                color: TOPIC_COLORS[word.topic] || 'var(--muted)',
                borderColor: (TOPIC_COLORS[word.topic] || '#7070a0') + '50',
              }}>
                {word.topic}
              </span>
            )}
            <span className="tag">{word.difficulty}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ms.bg, color: ms.color, letterSpacing: 0.3 }}>
              {ms.label}
            </span>
          </div>
          <div style={{ marginTop: 5, fontSize: 13, color: 'var(--muted)' }}>{word.chineseMeaning}</div>
          <div style={{ marginTop: 3, fontSize: 13 }}>{word.englishDefinition}</div>
          {word.businessExamples?.[0] && (
            <div style={{
              marginTop: 9, fontSize: 13, color: 'var(--text)',
              background: 'var(--surface2)', borderRadius: 6,
              padding: '7px 12px', borderLeft: '3px solid var(--accent2)',
            }}>
              <span style={{ color: 'var(--accent2)', fontWeight: 600, marginRight: 6 }}>e.g.</span>
              {word.businessExamples[0]}
            </div>
          )}
          {/* Tags */}
          <div style={{ marginTop: 8 }}>
            <TagEditor tags={word.tags ?? []} onChange={onUpdateTags} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={onToggleStar}
            title={word.highlighted ? 'Remove from priority' : 'Mark as priority'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: word.highlighted ? '#eab308' : 'var(--muted)', padding: 2 }}
          >
            <Star size={14} fill={word.highlighted ? 'currentColor' : 'none'} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {word.businessExamples?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Business Examples</div>
              {word.businessExamples.map((ex, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ color: 'var(--accent2)', fontSize: 11, marginTop: 3, flexShrink: 0 }}>▸</span>
                  <span style={{ fontSize: 13 }}>{ex}</span>
                  <button onClick={() => speak(ex)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, flexShrink: 0 }}>
                    {ttsText === ex && ttsState === 'playing' ? <Pause size={11} /> : <Volume2 size={11} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {word.alternatives?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Alternative Expressions</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {word.alternatives.map((alt, i) => (
                  <div key={i} className="card-sm" style={{ fontSize: 12 }}>
                    <span className="tag-accent" style={{ marginRight: 5 }}>{alt.style}</span>
                    {alt.expression}
                  </div>
                ))}
              </div>
            </div>
          )}

          {word.collocations?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Common Collocations</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {word.collocations.map((c, i) => (
                  <span key={i} className="tag-accent">{c}</span>
                ))}
              </div>
            </div>
          )}

          {word.wordRoot && (
            <WordStructureBlock wordRoot={word.wordRoot} relatedWords={word.relatedWords} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── PassageCard ──────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  meeting: 'Meeting', magazine: 'Magazine', newsletter: 'Newsletter', paper: 'Paper', other: 'Other',
}

function PassageCard({ passage, onDelete }: {
  passage: Passage
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const mastery = getMastery(passage)
  const ms = MASTERY_META[mastery]
  const { ttsState, ttsText } = useTTS()

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {passage.sourceLabel && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>{passage.sourceLabel}</span>
            )}
            <span className="tag">{SOURCE_LABELS[passage.sourceType] ?? passage.sourceType}</span>
            {passage.tone && <span className="tag" style={{ textTransform: 'capitalize' }}>{passage.tone}</span>}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ms.bg, color: ms.color, letterSpacing: 0.3 }}>
              {ms.label}
            </span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)' }}>
            {passage.text.length > 200 ? passage.text.slice(0, 200) + '…' : passage.text}
          </div>
          {passage.chineseSummary && (
            <div style={{ marginTop: 5, fontSize: 12, color: 'var(--muted)' }}>{passage.chineseSummary}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => speak(passage.text, 0.85)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {ttsText === passage.text && ttsState === 'playing' ? <Pause size={15} /> : <Volume2 size={15} />}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {passage.keyPhrases?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Key Phrases</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {passage.keyPhrases.map((kp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, background: 'var(--surface2)', borderRadius: 6, padding: '6px 10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>{kp.phrase}</span>
                    <span style={{ color: 'var(--muted)' }}>— {kp.chineseMeaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {passage.notablePatterns?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Notable Patterns</div>
              {passage.notablePatterns.map((pat, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--accent2)' }}>▸</span> {pat}
                </div>
              ))}
            </div>
          )}
          {passage.pronunciationFocus && (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
              💡 {passage.pronunciationFocus}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DailySentenceCard ────────────────────────────────────────────────────────
const REGISTER_COLOR: Record<string, string> = {
  informal:     '#f97316',
  'semi-formal':'#3b6fd4',
  formal:       '#5b5bd6',
}

function DailySentenceCard({ sentence, onDelete, onToggleStar, onUpdateTags }: { sentence: DailySentence; onDelete: () => void; onToggleStar: () => void; onUpdateTags: (tags: string[]) => void }) {
  const [expanded, setExpanded] = useState(false)
  const mastery = getMastery(sentence)
  const ms = MASTERY_META[mastery]
  const { ttsState, ttsText } = useTTS()

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {sentence.tone && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(59,111,212,0.1)', color: 'var(--accent)',
                border: '1px solid rgba(59,111,212,0.2)',
              }}>
                🎭 {sentence.tone}
              </span>
            )}
            {sentence.register && (
              <span className="tag" style={{ color: REGISTER_COLOR[sentence.register] ?? 'var(--muted)' }}>
                {sentence.register}
              </span>
            )}
            {sentence.topic && (
              <span className="tag" style={{
                color: TOPIC_COLORS[sentence.topic] || 'var(--muted)',
                borderColor: (TOPIC_COLORS[sentence.topic] || '#7070a0') + '50',
              }}>
                {sentence.topic}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: ms.bg, color: ms.color, letterSpacing: 0.3 }}>
              {ms.label}
            </span>
          </div>
          {/* Text preview */}
          <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', marginBottom: 4 }}>
            {sentence.text.length > 180 ? sentence.text.slice(0, 180) + '…' : sentence.text}
          </div>
          {sentence.chineseTranslation && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sentence.chineseTranslation.slice(0, 100)}{sentence.chineseTranslation.length > 100 ? '…' : ''}</div>
          )}
          {/* Tags */}
          <div style={{ marginTop: 6 }}>
            <TagEditor tags={sentence.tags ?? []} onChange={onUpdateTags} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={onToggleStar}
            title={sentence.highlighted ? 'Remove from priority' : 'Mark as priority'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: sentence.highlighted ? '#eab308' : 'var(--muted)', padding: 2 }}
          >
            <Star size={14} fill={sentence.highlighted ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => speak(sentence.text, 0.85)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {ttsText === sentence.text && ttsState === 'playing' ? <Pause size={15} /> : <Volume2 size={15} />}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full text */}
          <div style={{ fontSize: 13, lineHeight: 1.7, background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>
            {sentence.text}
          </div>

          {/* Key phrases */}
          {sentence.keyPhrases?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Key Phrases</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sentence.keyPhrases.map((kp, i) => (
                  <div key={i} style={{ background: 'var(--surface2)', borderRadius: 7, padding: '8px 12px', borderLeft: '3px solid var(--accent)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>&ldquo;{kp.phrase}&rdquo;</div>
                    <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{kp.meaning}</div>
                    {kp.chineseMeaning && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{kp.chineseMeaning}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pronunciation */}
          {(sentence.stressedWords?.length > 0 || sentence.naturalTips?.length > 0 || sentence.pronunciationNote) && (
            <div style={{ background: 'rgba(59,111,212,0.05)', border: '1px solid rgba(59,111,212,0.18)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>🗣 How to say it</div>
              {sentence.pronunciationNote && (
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{sentence.pronunciationNote}</div>
              )}
              {sentence.stressedWords?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {sentence.stressedWords.map((w, i) => (
                    <span key={i} style={{ background: 'rgba(59,111,212,0.12)', border: '1px solid rgba(59,111,212,0.28)', borderRadius: 5, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{w}</span>
                  ))}
                </div>
              )}
              {sentence.naturalTips?.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(59,111,212,0.12)', borderRadius: 4, padding: '1px 6px', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type DiffFilter    = 'all' | 'basic' | 'intermediate' | 'advanced'
type MasteryFilter = 'all' | Mastery

export default function SavedPage() {
  const [activeTab, setActiveTab]         = useState<'vocab' | 'passages' | 'sentences'>('vocab')
  const [words, setWords]                 = useState<VocabWord[]>([])
  const [passages, setPassages]           = useState<Passage[]>([])
  const [sentences, setSentences]         = useState<DailySentence[]>([])
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [search, setSearch]               = useState('')
  const [diffFilter, setDiffFilter]       = useState<DiffFilter>('all')
  const [masteryFilter, setMasteryFilter]         = useState<MasteryFilter>('all')
  const [filterStarredVocab, setFilterStarredVocab]         = useState(false)
  const [filterStarredSentences, setFilterStarredSentences] = useState(false)
  const [filterTagVocab, setFilterTagVocab]                 = useState('')
  const [filterTagSentences, setFilterTagSentences]         = useState('')
  const [recatStatus, setRecatStatus]             = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [recatMessage, setRecatMessage]           = useState('')
  const [importStatus, setImportStatus]           = useState<'idle' | 'done' | 'error'>('idle')
  const [importMessage, setImportMessage]         = useState('')

  useEffect(() => {
    setWords(vocabStore.getAll())
    setPassages(passageStore.getAll())
    setSentences(dailySentenceStore.getAll())
  }, [])

  // ── Vocab derived state ────────────────────────────────────────────────────
  const topicMap = words.reduce<Record<string, VocabWord[]>>((acc, w) => {
    const t = w.topic || 'general'
    if (!acc[t]) acc[t] = []
    acc[t].push(w)
    return acc
  }, {})
  const topics = Object.keys(topicMap).sort((a, b) => topicMap[b].length - topicMap[a].length)

  const filteredWords = words.filter(w => {
    if (selectedTopic !== 'all' && (w.topic || 'general') !== selectedTopic) return false
    if (diffFilter !== 'all' && w.difficulty !== diffFilter) return false
    if (masteryFilter !== 'all' && getMastery(w) !== masteryFilter) return false
    if (filterStarredVocab && !w.highlighted) return false
    if (filterTagVocab && !(w.tags ?? []).includes(filterTagVocab)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        w.word.toLowerCase().includes(q) ||
        w.chineseMeaning.includes(q) ||
        w.englishDefinition.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Passage derived state ──────────────────────────────────────────────────
  const filteredPassages = passages.filter(p => {
    if (masteryFilter !== 'all' && getMastery(p) !== masteryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        p.text.toLowerCase().includes(q) ||
        p.sourceLabel.toLowerCase().includes(q) ||
        p.chineseSummary.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Sentence derived state ─────────────────────────────────────────────────
  const sentenceTopicMap = sentences.reduce<Record<string, DailySentence[]>>((acc, s) => {
    const t = s.topic || 'general'
    if (!acc[t]) acc[t] = []
    acc[t].push(s)
    return acc
  }, {})
  const sentenceTopics = Object.keys(sentenceTopicMap).sort((a, b) => sentenceTopicMap[b].length - sentenceTopicMap[a].length)

  const filteredSentences = sentences.filter(s => {
    if (selectedTopic !== 'all' && (s.topic || 'general') !== selectedTopic) return false
    if (masteryFilter !== 'all' && getMastery(s) !== masteryFilter) return false
    if (filterStarredSentences && !s.highlighted) return false
    if (filterTagSentences && !(s.tags ?? []).includes(filterTagSentences)) return false
    if (search) {
      const q = search.toLowerCase()
      return s.text.toLowerCase().includes(q) || s.chineseTranslation.toLowerCase().includes(q) || s.tone.toLowerCase().includes(q)
    }
    return true
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const masteredWords    = words.filter(w => getMastery(w) === 'mastered').length
  const masteredPassages = passages.filter(p => getMastery(p) === 'mastered').length

  // ── Handlers ──────────────────────────────────────────────────────────────
  const deleteWord = useCallback((id: string) => {
    vocabStore.remove(id)
    setWords(vocabStore.getAll())
  }, [])

  const deletePassage = useCallback((id: string) => {
    passageStore.remove(id)
    setPassages(passageStore.getAll())
  }, [])

  const deleteSentence = useCallback((id: string) => {
    dailySentenceStore.remove(id)
    setSentences(dailySentenceStore.getAll())
  }, [])

  const toggleStarWord = useCallback((id: string) => {
    const w = vocabStore.getAll().find(x => x.id === id)
    if (!w) return
    vocabStore.update(id, { highlighted: !w.highlighted })
    setWords(vocabStore.getAll())
  }, [])

  const toggleStarSentence = useCallback((id: string) => {
    const s = dailySentenceStore.getAll().find(x => x.id === id)
    if (!s) return
    dailySentenceStore.update(id, { highlighted: !s.highlighted })
    setSentences(dailySentenceStore.getAll())
  }, [])

  const updateWordTags = useCallback((id: string, tags: string[]) => {
    vocabStore.update(id, { tags })
    setWords(vocabStore.getAll())
  }, [])

  const updateSentenceTags = useCallback((id: string, tags: string[]) => {
    dailySentenceStore.update(id, { tags })
    setSentences(dailySentenceStore.getAll())
  }, [])

  // ── Re-categorise all ─────────────────────────────────────────────────────
  const recategoriseAll = async () => {
    const current = vocabStore.getAll()
    if (current.length === 0) return
    setRecatStatus('loading')
    setRecatMessage('')
    try {
      const res = await fetch('/api/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: current.map(w => w.word) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      const mapping: Record<string, string> = data.mapping
      let updated = 0
      current.forEach(w => {
        const newTopic = mapping[w.word]
        if (newTopic && newTopic !== w.topic) {
          vocabStore.update(w.id, { topic: newTopic })
          updated++
        }
      })
      setWords(vocabStore.getAll())
      setRecatStatus('done')
      setRecatMessage(`Updated ${updated} word${updated !== 1 ? 's' : ''}`)
    } catch (e) {
      setRecatStatus('error')
      setRecatMessage(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: 1,
      vocab:     vocabStore.getAll(),
      passages:  passageStore.getAll(),
      sentences: dailySentenceStore.getAll(),
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href     = url
    a.download = `bec-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        let count = 0
        if (Array.isArray(data.vocab)) {
          vocabStore.save(data.vocab)
          count += data.vocab.length
        }
        if (Array.isArray(data.passages)) {
          passageStore.save(data.passages)
          count += data.passages.length
        }
        if (Array.isArray(data.sentences)) {
          dailySentenceStore.save(data.sentences)
          count += data.sentences.length
        }
        setWords(vocabStore.getAll())
        setPassages(passageStore.getAll())
        setSentences(dailySentenceStore.getAll())
        setImportStatus('done')
        setImportMessage(`Restored ${count} items successfully`)
      } catch {
        setImportStatus('error')
        setImportMessage('Invalid backup file')
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be re-imported
    e.target.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 1080 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Saved Library</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
              All your saved vocabulary and passages, organized by topic and mastery level.
            </p>
          </div>

          {/* Backup controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {importStatus === 'done' && (
              <span style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> {importMessage}
              </span>
            )}
            {importStatus === 'error' && (
              <span style={{ fontSize: 12, color: '#ef4444' }}>{importMessage}</span>
            )}
            <button
              onClick={handleExport}
              className="btn-secondary"
              title="Download all your data as a backup file"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Download size={13} /> Export
            </button>
            <label
              title="Restore from a backup file"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                cursor: 'pointer', padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text)', fontWeight: 500,
              }}
            >
              <Upload size={13} /> Import
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Words saved',       value: words.length,      color: 'var(--accent)'  },
            { label: 'Words mastered',    value: masteredWords,     color: '#16a34a'        },
            { label: 'Sentences saved',   value: sentences.length,  color: '#f97316'        },
            { label: 'Passages saved',    value: passages.length,   color: '#a78bfa'        },
            { label: 'Passages mastered', value: masteredPassages,  color: '#16a34a'        },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 18px', minWidth: 100,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Re-categorise banner — only shown when there are vocab words */}
        {words.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Re-categorise all words</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Send all {words.length} saved words to AI in one batch to assign the correct topic labels.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {recatStatus === 'done' && (
                <span style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={14} /> {recatMessage}
                </span>
              )}
              {recatStatus === 'error' && (
                <span style={{ fontSize: 12, color: '#ef4444' }}>{recatMessage}</span>
              )}
              <button
                onClick={recategoriseAll}
                disabled={recatStatus === 'loading'}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <RefreshCw size={13} style={{ animation: recatStatus === 'loading' ? 'spin 1s linear infinite' : 'none' }} />
                {recatStatus === 'loading' ? 'Categorising…' : 'Run now'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {([
            { key: 'vocab',     label: `Vocabulary (${words.length})`   },
            { key: 'sentences', label: `Sentences (${sentences.length})` },
            { key: 'passages',  label: `Passages (${passages.length})`  },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => { setActiveTab(key); setSearch(''); setSelectedTopic('all') }}
              style={{
                padding: '8px 20px', fontSize: 14,
                fontWeight: activeTab === key ? 600 : 400,
                color: activeTab === key ? 'var(--text)' : 'var(--muted)',
                background: 'none', border: 'none',
                borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="input"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: '100%' }}
            />
          </div>

          {/* Mastery chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'new', 'learning', 'familiar', 'mastered'] as const).map(m => {
              const isActive = masteryFilter === m
              const meta = m !== 'all' ? MASTERY_META[m] : null
              return (
                <button key={m} onClick={() => setMasteryFilter(m)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1px solid ${isActive && meta ? meta.color + '60' : 'var(--border)'}`,
                  background: isActive ? (meta ? meta.bg : 'var(--accent)') : 'var(--surface2)',
                  color:      isActive ? (meta ? meta.color : 'white') : 'var(--muted)',
                  cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                }}>
                  {m === 'all' ? 'All levels' : meta!.label}
                </button>
              )
            })}
          </div>

          {/* Starred filter */}
          {activeTab === 'vocab' && (
            <button
              onClick={() => setFilterStarredVocab(f => !f)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${filterStarredVocab ? '#eab308' : 'var(--border)'}`,
                background: filterStarredVocab ? 'rgba(234,179,8,0.12)' : 'var(--surface2)',
                color: filterStarredVocab ? '#eab308' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Star size={11} fill={filterStarredVocab ? 'currentColor' : 'none'} /> Starred
            </button>
          )}
          {activeTab === 'sentences' && (
            <button
              onClick={() => setFilterStarredSentences(f => !f)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${filterStarredSentences ? '#eab308' : 'var(--border)'}`,
                background: filterStarredSentences ? 'rgba(234,179,8,0.12)' : 'var(--surface2)',
                color: filterStarredSentences ? '#eab308' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Star size={11} fill={filterStarredSentences ? 'currentColor' : 'none'} /> Starred
            </button>
          )}

          {/* Custom tag filter chips */}
          {activeTab === 'vocab' && Array.from(new Set(words.flatMap(w => w.tags ?? []))).sort().map(tag => (
            <button key={tag} onClick={() => setFilterTagVocab(filterTagVocab === tag ? '' : tag)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${filterTagVocab === tag ? 'rgba(167,139,250,0.5)' : 'var(--border)'}`,
                background: filterTagVocab === tag ? 'rgba(167,139,250,0.12)' : 'var(--surface2)',
                color: filterTagVocab === tag ? '#a78bfa' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <Tag size={10} /> #{tag}
            </button>
          ))}
          {activeTab === 'sentences' && Array.from(new Set(sentences.flatMap(s => s.tags ?? []))).sort().map(tag => (
            <button key={tag} onClick={() => setFilterTagSentences(filterTagSentences === tag ? '' : tag)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${filterTagSentences === tag ? 'rgba(167,139,250,0.5)' : 'var(--border)'}`,
                background: filterTagSentences === tag ? 'rgba(167,139,250,0.12)' : 'var(--surface2)',
                color: filterTagSentences === tag ? '#a78bfa' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <Tag size={10} /> #{tag}
            </button>
          ))}

          {/* Difficulty chips — vocab tab only */}
          {activeTab === 'vocab' && (
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'basic', 'intermediate', 'advanced'] as const).map(d => (
                <button key={d} onClick={() => setDiffFilter(d)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1px solid ${diffFilter === d ? 'var(--accent)' : 'var(--border)'}`,
                  background: diffFilter === d ? 'rgba(59,111,212,0.12)' : 'var(--surface2)',
                  color: diffFilter === d ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer', fontWeight: diffFilter === d ? 600 : 400,
                }}>
                  {d === 'all' ? 'Any level' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── VOCABULARY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'vocab' && (
          words.length === 0 ? (
            <EmptyState icon="📚" title="No vocabulary saved yet" sub="Head to the Vocabulary tab to start learning words." />
          ) : (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

              {/* Topic sidebar */}
              <aside style={{ width: 176, flexShrink: 0, position: 'sticky', top: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Topics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* All */}
                  <button onClick={() => setSelectedTopic('all')} style={topicBtnStyle(selectedTopic === 'all', undefined)}>
                    <span>All topics</span>
                    <CountBadge count={words.length} />
                  </button>
                  {/* Each topic */}
                  {topics.map(t => {
                    const color = TOPIC_COLORS[t] || '#7070a0'
                    return (
                      <button key={t} onClick={() => setSelectedTopic(t)} style={topicBtnStyle(selectedTopic === t, color)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          {t}
                        </span>
                        <CountBadge count={topicMap[t].length} />
                      </button>
                    )
                  })}
                </div>
              </aside>

              {/* Word list */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                  {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
                  {selectedTopic !== 'all' && ` in "${selectedTopic}"`}
                </div>

                {filteredWords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                    <div>No words match your current filters</div>
                  </div>
                ) : (
                  filteredWords.map(word => (
                    <VocabCard
                      key={word.id}
                      word={word}
                      onDelete={() => deleteWord(word.id)}
                      onToggleStar={() => toggleStarWord(word.id)}
                      onUpdateTags={(tags) => updateWordTags(word.id, tags)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        )}

        {/* ── SENTENCES TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'sentences' && (
          sentences.length === 0 ? (
            <EmptyState icon="💬" title="No sentences saved yet" sub="Head to Daily Sentences and analyse any sentence — it will be saved here automatically." />
          ) : (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

              {/* Topic sidebar */}
              <aside style={{ width: 176, flexShrink: 0, position: 'sticky', top: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Topics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button onClick={() => setSelectedTopic('all')} style={topicBtnStyle(selectedTopic === 'all', undefined)}>
                    <span>All topics</span>
                    <CountBadge count={sentences.length} />
                  </button>
                  {sentenceTopics.map(t => {
                    const color = TOPIC_COLORS[t] || '#7070a0'
                    return (
                      <button key={t} onClick={() => setSelectedTopic(t)} style={topicBtnStyle(selectedTopic === t, color)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          {t}
                        </span>
                        <CountBadge count={sentenceTopicMap[t].length} />
                      </button>
                    )
                  })}
                </div>
              </aside>

              {/* Sentence list */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                  {filteredSentences.length} sentence{filteredSentences.length !== 1 ? 's' : ''}
                  {selectedTopic !== 'all' && ` in "${selectedTopic}"`}
                </div>

                {filteredSentences.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                    <div>No sentences match your current filters</div>
                  </div>
                ) : (
                  filteredSentences.map(s => (
                    <DailySentenceCard
                      key={s.id}
                      sentence={s}
                      onDelete={() => deleteSentence(s.id)}
                      onToggleStar={() => toggleStarSentence(s.id)}
                      onUpdateTags={(tags) => updateSentenceTags(s.id, tags)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        )}

        {/* ── PASSAGES TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'passages' && (
          passages.length === 0 ? (
            <EmptyState icon="📄" title="No passages saved yet" sub="Head to the Passages tab to save business passages for review." />
          ) : filteredPassages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div>No passages match your current filters</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                {filteredPassages.length} passage{filteredPassages.length !== 1 ? 's' : ''}
              </div>
              {filteredPassages.map(p => (
                <PassageCard
                  key={p.id}
                  passage={p}
                  onDelete={() => deletePassage(p.id)}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span style={{
      fontSize: 11, background: 'var(--surface2)', borderRadius: 4,
      padding: '1px 7px', color: 'var(--muted)', flexShrink: 0,
    }}>
      {count}
    </span>
  )
}

function topicBtnStyle(active: boolean, accentColor: string | undefined): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 10px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? 'var(--text)' : 'var(--muted)',
    background: active ? 'var(--surface2)' : 'transparent',
    border: active
      ? `1px solid ${accentColor ? accentColor + '40' : 'var(--border)'}`
      : '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    gap: 6,
  }
}
