'use client'
import { useState, useRef, useEffect } from 'react'
import Nav from '@/components/Nav'
import { vocabStore, passageStore } from '@/lib/storage'
import { Mic, MicOff, Volume2, Loader2, RefreshCw } from 'lucide-react'

const PRACTICE_SENTENCES = [
  "The primary driver behind the variance is a shift in customer acquisition costs.",
  "We need stronger cross-functional synergy to improve execution efficiency.",
  "From a resource allocation perspective, we should prioritize high-ROI initiatives.",
  "I'd like to push back on that assumption — the data suggests otherwise.",
  "Let's align on success metrics before we finalize the scope.",
  "This initiative has strong strategic alignment with our Q3 priorities.",
  "Going to need to walk through the key takeaways from last quarter.",
  "Want to make sure we're kind of on the same page before moving forward.",
]

function speak(text: string, rate = 0.85) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  window.speechSynthesis.speak(u)
}

type FeedbackData = {
  score: number
  accuracy: string
  feedback: string
  focusAreas: string[]
  nativeTip: string
}

export default function PronunciationPage() {
  const [target, setTarget] = useState(PRACTICE_SENTENCES[0])
  const [customInput, setCustomInput] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribed, setTranscribed] = useState('')
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<{ stop(): void } | null>(null)

  const [vocabWords, setVocabWords] = useState<string[]>([])
  const [passageSnippets, setPassageSnippets] = useState<string[]>([])

  useEffect(() => {
    setVocabWords(vocabStore.getAll().map(w => w.word))
    // Pull the first sentence of each saved passage as a quick practice target
    setPassageSnippets(
      passageStore.getAll().flatMap(p =>
        p.keyPhrases.slice(0, 2).map(kp => kp.phrase)
      ).slice(0, 12)
    )
  }, [])

  const activeTarget = useCustom ? customInput : target

  const startRecording = () => {
    type SR = { new(): SpeechRecognitionInstance; }
    type SpeechRecognitionInstance = {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start(): void; stop(): void;
    }
    const w = window as typeof window & { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscribed(result)
      setFeedback(null)
    }

    recognition.onerror = () => {
      setError('Could not capture audio. Make sure microphone access is allowed.')
      setRecording(false)
    }

    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
    setTranscribed('')
    setFeedback(null)
    setError('')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const getFeedback = async () => {
    if (!transcribed || !activeTarget) return
    setLoadingFeedback(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original: activeTarget, transcribed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFeedback(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get feedback')
    } finally {
      setLoadingFeedback(false)
    }
  }

  const scoreColor = feedback
    ? feedback.score >= 80 ? '#22c55e' : feedback.score >= 60 ? '#eab308' : '#ef4444'
    : 'var(--accent)'

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 860 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Pronunciation Coach</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>Record yourself, compare to native speech, and get AI feedback.</p>

        {/* Target sentence selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>Choose a sentence to practice</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setUseCustom(false)} className={!useCustom ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 13 }}>
              Preset
            </button>
            <button onClick={() => setUseCustom(true)} className={useCustom ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 13 }}>
              Custom
            </button>
          </div>

          {!useCustom ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...PRACTICE_SENTENCES, ...passageSnippets.slice(0, 4)].map((s, i) => (
                <button key={i} onClick={() => { setTarget(s); setTranscribed(''); setFeedback(null) }}
                  style={{
                    background: target === s ? 'rgba(108,99,255,0.12)' : 'var(--surface2)',
                    border: `1px solid ${target === s ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <textarea className="input" placeholder="Type any sentence you want to practice…" value={customInput}
              onChange={e => { setCustomInput(e.target.value); setTranscribed(''); setFeedback(null) }}
              rows={3} style={{ resize: 'vertical' }} />
          )}
        </div>

        {/* Practice area */}
        {activeTarget && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Target Sentence</div>
            <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.6, marginBottom: 16 }}>{activeTarget}</div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => speak(activeTarget, 0.85)} className="btn-secondary">
                <Volume2 size={15} /> Listen (slow)
              </button>
              <button onClick={() => speak(activeTarget, 1.0)} className="btn-secondary">
                <Volume2 size={15} /> Listen (normal)
              </button>

              <button
                onClick={recording ? stopRecording : startRecording}
                style={{
                  background: recording ? '#ef4444' : 'var(--accent)',
                  color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  position: 'relative',
                }}>
                {recording ? <MicOff size={15} /> : <Mic size={15} />}
                {recording ? 'Stop Recording' : 'Record'}
              </button>

              {(transcribed || feedback) && (
                <button onClick={() => { setTranscribed(''); setFeedback(null) }} className="btn-secondary">
                  <RefreshCw size={14} /> Reset
                </button>
              )}
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</div>}

            {recording && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', fontSize: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                Listening… speak clearly into your microphone
              </div>
            )}
          </div>
        )}

        {/* Transcription result */}
        {transcribed && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>What I heard</div>
            <div style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>{transcribed}</div>
            <button onClick={getFeedback} className="btn-primary" disabled={loadingFeedback}>
              {loadingFeedback ? <Loader2 size={15} className="animate-spin" /> : null}
              {loadingFeedback ? 'Analyzing…' : 'Get AI Feedback'}
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="card">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `4px solid ${scoreColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: scoreColor, flexShrink: 0,
              }}>
                {feedback.score}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: scoreColor }}>
                  {feedback.accuracy === 'excellent' ? 'Excellent!' : feedback.accuracy === 'good' ? 'Good job!' : feedback.accuracy === 'fair' ? 'Keep practicing!' : 'Needs work'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>{feedback.feedback}</div>
              </div>
            </div>

            {feedback.focusAreas.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Focus Areas</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {feedback.focusAreas.map((area, i) => (
                    <span key={i} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '2px 10px', fontSize: 12, color: '#ef4444' }}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Native Speaker Tip</div>
              <div style={{ fontSize: 14 }}>{feedback.nativeTip}</div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button onClick={() => speak(activeTarget, 0.85)} className="btn-secondary">
                <Volume2 size={14} /> Listen again
              </button>
              <button onClick={recording ? stopRecording : startRecording} className="btn-primary">
                <Mic size={14} /> Try again
              </button>
            </div>
          </div>
        )}

        {vocabWords.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Practice your saved vocabulary</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vocabWords.slice(0, 12).map((w, i) => (
                <button key={i} onClick={() => { setUseCustom(true); setCustomInput(w); setTranscribed(''); setFeedback(null) }}
                  className="tag-accent" style={{ cursor: 'pointer', border: 'none' }}>{w}</button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
