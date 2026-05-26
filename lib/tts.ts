// Shared TTS utility
// Primary:  ElevenLabs (natural, human-sounding) — requires ELEVENLABS_API_KEY
// Fallback: Web Speech API with best available browser voice

let _audioCtx: AudioContext | null = null
let _currentSource: AudioBufferSourceNode | null = null

function getAudioContext() {
  if (!_audioCtx) _audioCtx = new AudioContext()
  return _audioCtx
}

// Best neural/enhanced voices to try in order of preference
const PREFERRED_VOICES = [
  'Google US English',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Samantha',   // macOS high-quality
  'Alex',       // macOS
  'Karen',      // macOS
]

function getBestBrowserVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  // Fallback: any en-US voice, preferring those with "Enhanced" or "Online"
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
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  u.pitch = 1.0
  const voice = getBestBrowserVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

/**
 * Play text using ElevenLabs (natural) with Web Speech fallback.
 * @param text     Text to speak
 * @param rate     Playback rate for browser fallback (default 0.88)
 */
export async function speak(text: string, rate = 0.88): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Try ElevenLabs first
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      // Fall back to browser voice (e.g. key not configured, quota hit)
      speakBrowser(text, rate)
      return
    }

    const arrayBuffer = await res.arrayBuffer()
    const ctx = getAudioContext()

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') await ctx.resume()

    // Stop any currently playing audio
    _currentSource?.stop()
    _currentSource = null

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.start(0)
    _currentSource = source
  } catch {
    // Network error or any other issue — fall back silently
    speakBrowser(text, rate)
  }
}

/** Stop any currently playing ElevenLabs or browser audio */
export function stopSpeech() {
  if (typeof window === 'undefined') return
  _currentSource?.stop()
  _currentSource = null
  window.speechSynthesis?.cancel()
}
