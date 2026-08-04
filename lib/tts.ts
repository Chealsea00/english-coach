/**
 * Shared TTS utility with pause / resume support.
 * Primary:  ElevenLabs (natural, human-sounding) — requires ELEVENLABS_API_KEY
 * Fallback: Web Speech API with best available browser voice
 */

export type TTSState = 'idle' | 'loading' | 'playing' | 'paused'

type Listener = (state: TTSState, text: string, rate: number) => void

let _state: TTSState = 'idle'
let _currentText     = ''
let _currentRate     = 1.0
let _audio: HTMLAudioElement | null = null
let _usingBrowser    = false
const _listeners: Listener[] = []

function setState(s: TTSState, text?: string, rate?: number) {
  _state = s
  if (text !== undefined) _currentText = text
  if (rate !== undefined) _currentRate = rate
  _listeners.forEach(fn => fn(_state, _currentText, _currentRate))
}

/** Subscribe to TTS state changes. Returns an unsubscribe function. */
export function onTTSStateChange(fn: Listener): () => void {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i >= 0) _listeners.splice(i, 1)
  }
}

/** Get current TTS state snapshot (for SSR-safe initial hook values). */
export function getTTSState(): { state: TTSState; text: string; rate: number } {
  return { state: _state, text: _currentText, rate: _currentRate }
}

// ─── Browser voice helpers ────────────────────────────────────────────────────

const PREFERRED_VOICES = [
  'Google US English',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Samantha',
  'Alex',
  'Karen',
]

function getBestBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  const enUS = voices.filter(v => v.lang.startsWith('en'))
  return (
    enUS.find(v => v.name.toLowerCase().includes('enhanced')) ||
    enUS.find(v => v.name.toLowerCase().includes('online'))  ||
    enUS[0] ||
    null
  )
}

function speakBrowser(text: string, rate = 0.88) {
  window.speechSynthesis.cancel()
  const u      = new SpeechSynthesisUtterance(text)
  u.lang       = 'en-US'
  u.rate       = rate
  u.pitch      = 1.0
  u.onstart    = () => setState('playing')
  u.onend      = () => setState('idle', '', 1.0)
  u.onerror    = () => setState('idle', '', 1.0)
  const voice  = getBestBrowserVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

// Stop audio silently (no state broadcast) before starting a new clip
function stopAudioSilently() {
  if (_usingBrowser) {
    window.speechSynthesis?.cancel()
  } else if (_audio) {
    _audio.pause()
    _audio = null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak text via ElevenLabs (with Web Speech fallback).
 * • Same text + rate while playing → pause
 * • Same text + rate while paused  → resume
 * • Different text / rate          → stop current, start new
 */
export async function speak(text: string, rate = 0.88): Promise<void> {
  if (typeof window === 'undefined') return

  // Toggle if this exact button is already active
  if (
    _currentText === text &&
    _currentRate === rate &&
    (_state === 'playing' || _state === 'paused')
  ) {
    toggleSpeech()
    return
  }

  stopAudioSilently()
  setState('loading', text, rate)

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      _usingBrowser = true
      speakBrowser(text, rate)
      return
    }

    _usingBrowser = false
    const blob    = new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' })
    const url     = URL.createObjectURL(blob)
    const audio   = new Audio(url)
    audio.playbackRate = rate
    _audio = audio

    audio.addEventListener('play',  () => setState('playing'))
    audio.addEventListener('pause', () => { if (!audio.ended) setState('paused') })
    audio.addEventListener('ended', () => {
      setState('idle', '', 1.0)
      URL.revokeObjectURL(url)
      _audio = null
    })
    audio.addEventListener('error', () => {
      setState('idle', '', 1.0)
      URL.revokeObjectURL(url)
      _audio = null
      _usingBrowser = true
      speakBrowser(text, rate)
    })

    await audio.play()
  } catch {
    _usingBrowser = true
    speakBrowser(text, rate)
  }
}

/** Toggle pause / resume for the currently active audio. */
export function toggleSpeech(): void {
  if (typeof window === 'undefined') return

  if (_usingBrowser) {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setState('paused')
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setState('playing')
    }
    return
  }

  if (!_audio) return
  if (_audio.paused) {
    _audio.play()
  } else {
    _audio.pause()
  }
}

/** Stop all audio completely and reset to idle. */
export function stopSpeech(): void {
  if (typeof window === 'undefined') return
  stopAudioSilently()
  setState('idle', '', 1.0)
}
