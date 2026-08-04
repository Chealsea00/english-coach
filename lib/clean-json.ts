/**
 * Extract and sanitise a JSON object from an LLM response.
 *
 * LLMs occasionally produce JSON that is almost-but-not-quite valid:
 *   • Wrapped in markdown code fences  (```json … ```)
 *   • Trailing commas before ] or }    (["a", "b",])
 *   • Leading/trailing prose
 *
 * This helper handles all of the above so JSON.parse succeeds.
 */
export function cleanJSON(raw: string): string {
  // 1. Extract the outermost { … } block
  const start = raw.indexOf('{')
  const end   = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  let json = raw.slice(start, end + 1)

  // 2. Remove trailing commas before ] or }  e.g.  ["a","b",]  →  ["a","b"]
  json = json.replace(/,(\s*[}\]])/g, '$1')

  return json
}
