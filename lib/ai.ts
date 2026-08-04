/**
 * Shared AI utility — tries Gemini 2.5 Flash first,
 * automatically falls back to Groq (llama-3.3-70b) on quota / 429 errors.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const GROQ_MODEL   = 'llama-3.3-70b-versatile'
const GEMINI_MODEL = 'gemini-2.5-flash'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GEMINI_CONFIG: any = { thinkingConfig: { thinkingBudget: 0 } }

// ─── Streaming ────────────────────────────────────────────────────────────────

/**
 * Returns a plain-text ReadableStream for the given prompt.
 * Falls back to Groq if Gemini returns a quota error.
 */
export async function streamWithFallback(prompt: string): Promise<ReadableStream<Uint8Array>> {
  // 1. Try Gemini — buffer the full response so we can validate it before sending
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: GEMINI_CONFIG,
    })

    let fullText = ''
    for await (const chunk of result.stream) {
      fullText += chunk.text()
    }

    // Only use Gemini's response if it actually contains JSON
    if (fullText.includes('{')) {
      console.log('[ai] Gemini responded with valid JSON content')
      const encoder = new TextEncoder()
      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(fullText))
          controller.close()
        },
      })
    }

    // Gemini responded but without JSON (safety filter, empty response, etc.)
    console.warn('[ai] Gemini returned non-JSON — falling back to Groq. Preview:', fullText.slice(0, 120))
  } catch (e) {
    // Any Gemini failure (quota, "Failed to parse stream", network blips, etc.)
    // falls back to Groq — Gemini errors here are never the user's fault to fix.
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[ai] Gemini error — falling back to Groq:', msg)
  }

  // 2. Fallback: Groq streaming
  console.log('[ai] Using Groq fallback')
  return groqStream(prompt)
}

async function groqStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Gemini quota reached and no Groq API key configured.')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }
  if (!res.body) throw new Error('No response body from Groq')

  // Parse SSE stream → plain text stream
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const source  = res.body

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader()
      let buffer   = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') return
            try {
              const json  = JSON.parse(data)
              const text  = json.choices?.[0]?.delta?.content
              if (text) controller.enqueue(encoder.encode(text))
            } catch { /* skip malformed chunk */ }
          }
        }
      } finally {
        controller.close()
      }
    },
  })
}

// ─── Non-streaming ────────────────────────────────────────────────────────────

/**
 * Generates a complete response string for the given prompt.
 * Falls back to Groq if Gemini returns a quota error.
 */
export async function generateWithFallback(prompt: string): Promise<string> {
  // 1. Try Gemini
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: GEMINI_CONFIG,
    })
    const text = result.response.text()
    if (text.trim()) return text
    console.warn('[ai] Gemini returned empty response — falling back to Groq')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[ai] Gemini error — falling back to Groq:', msg)
  }

  // 2. Fallback: Groq non-streaming
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('Gemini failed and no Groq API key configured.')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ''
}
