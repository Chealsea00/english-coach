import { NextRequest, NextResponse } from 'next/server'

// ElevenLabs voice: "Rachel" — clear, calm, professional US English
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const MODEL_ID = 'eleven_turbo_v2_5'   // fastest + high quality

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 503 })
  }

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.45,          // slight variation = more natural
            similarity_boost: 0.80,
            style: 0.20,              // gentle expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('ElevenLabs error:', res.status, err)
      if (res.status === 401) return NextResponse.json({ error: 'Invalid ElevenLabs API key' }, { status: 401 })
      if (res.status === 429) return NextResponse.json({ error: 'ElevenLabs quota exceeded' }, { status: 429 })
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    // Stream the audio back to the client
    return new Response(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // cache identical text for 1h
      },
    })
  } catch (e) {
    console.error('TTS route error:', e)
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
  }
}
