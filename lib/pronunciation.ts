// ── Pronunciation practice helpers ──────────────────────────────────────────
// Client-side scoring built on top of the browser transcript + recording timing.
// (True phoneme-level acoustic scoring isn't available in-browser; word matching
//  is inferred by comparing the recognizer's transcript to the target text.)

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9'\s]/g, '').replace(/\s+/g, ' ').trim()

export type WordMatch = { word: string; matched: boolean }

// Align the heard transcript against the target using a longest-common-subsequence
// pass, so word order and small omissions/insertions are handled gracefully.
export function alignWords(target: string, heard: string): WordMatch[] {
  const targetTokens = target.split(/\s+/).filter(Boolean)
  const t = targetTokens.map(normalize)
  const h = normalize(heard).split(' ').filter(Boolean)

  // LCS dynamic-programming table
  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array(h.length + 1).fill(0))
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === h[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  // Walk the table to mark which target words were matched
  const matched = new Array(t.length).fill(false)
  let i = 0, j = 0
  while (i < t.length && j < h.length) {
    if (t[i] === h[j]) { matched[i] = true; i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  return targetTokens.map((word, idx) => ({ word, matched: matched[idx] }))
}

export function accuracyPct(matches: WordMatch[]): number {
  if (!matches.length) return 0
  return Math.round((matches.filter(m => m.matched).length / matches.length) * 100)
}

export type PaceVerdict = { wpm: number; label: string; color: string; comment: string }

// Conversational business English sits around 110–160 wpm.
export function paceVerdict(wordCount: number, durationSec: number): PaceVerdict | null {
  if (!durationSec || durationSec < 0.4 || wordCount < 1) return null
  const wpm = Math.round(wordCount / (durationSec / 60))
  if (wpm < 90)
    return { wpm, label: 'Slow', color: '#3b82f6', comment: 'A little slow — aim for a smoother, more connected flow.' }
  if (wpm <= 160)
    return { wpm, label: 'Natural', color: '#22c55e', comment: 'Great pace — right in the natural conversational range.' }
  if (wpm <= 190)
    return { wpm, label: 'Fast', color: '#eab308', comment: 'A bit fast — add small pauses at commas so it lands clearly.' }
  return { wpm, label: 'Too fast', color: '#ef4444', comment: 'Slow down and pause at commas and periods; you’re rushing.' }
}
