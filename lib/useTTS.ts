'use client'
import { useState, useEffect } from 'react'
import { onTTSStateChange, getTTSState, type TTSState } from './tts'

/**
 * React hook that tracks global TTS playback state.
 * Works across all components — they all share the same singleton.
 *
 * Usage:
 *   const { ttsState, ttsText, ttsRate } = useTTS()
 *   const isPlaying = ttsState === 'playing' && ttsText === myText
 */
export function useTTS() {
  const [ttsState, setTtsState] = useState<TTSState>('idle')
  const [ttsText,  setTtsText]  = useState('')
  const [ttsRate,  setTtsRate]  = useState(1.0)

  useEffect(() => {
    // Hydrate with current state on mount
    const snap = getTTSState()
    setTtsState(snap.state)
    setTtsText(snap.text)
    setTtsRate(snap.rate)

    return onTTSStateChange((state, text, rate) => {
      setTtsState(state)
      setTtsText(text)
      setTtsRate(rate)
    })
  }, [])

  return { ttsState, ttsText, ttsRate }
}
