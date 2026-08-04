import type { VocabWord, Passage, DailySentence, UserStats } from '@/types'
import { supabase } from '@/lib/supabase'

const KEYS = {
  VOCAB:           'bec_vocab',
  PASSAGES:        'bec_passages',
  DAILY_SENTENCES: 'bec_daily_sentences',
  STATS:           'bec_stats',
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────
// localStorage stays the synchronous source of truth for reads; every write is
// mirrored to Supabase in the background, keyed by the signed-in user.

let currentUserId: string | null = null

export function setSyncUser(id: string | null) {
  currentUserId = id
}

type RowTable = 'vocab' | 'passages' | 'daily_sentences'

function pushRow(table: RowTable, id: string, data: unknown) {
  if (!supabase || !currentUserId) return
  supabase.from(table)
    .upsert({ id, user_id: currentUserId, data, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.warn(`[sync] ${table} upsert:`, error.message) })
}

function deleteRow(table: RowTable, id: string) {
  if (!supabase || !currentUserId) return
  supabase.from(table).delete().eq('id', id)
    .then(({ error }) => { if (error) console.warn(`[sync] ${table} delete:`, error.message) })
}

function pushStats(data: UserStats) {
  if (!supabase || !currentUserId) return
  supabase.from('stats')
    .upsert({ user_id: currentUserId, data, updated_at: new Date().toISOString() })
    .then(({ error }) => { if (error) console.warn('[sync] stats upsert:', error.message) })
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export const vocabStore = {
  getAll: (): VocabWord[] => load(KEYS.VOCAB, []),
  save: (words: VocabWord[]) => save(KEYS.VOCAB, words),
  add: (word: VocabWord) => {
    vocabStore.save([word, ...vocabStore.getAll()])
    pushRow('vocab', word.id, word)
  },
  update: (id: string, patch: Partial<VocabWord>) => {
    const words = vocabStore.getAll().map(w => w.id === id ? { ...w, ...patch } : w)
    vocabStore.save(words)
    const updated = words.find(w => w.id === id)
    if (updated) pushRow('vocab', id, updated)
  },
  remove: (id: string) => {
    vocabStore.save(vocabStore.getAll().filter(w => w.id !== id))
    deleteRow('vocab', id)
  },
}

export const passageStore = {
  getAll: (): Passage[] => load(KEYS.PASSAGES, []),
  save: (passages: Passage[]) => save(KEYS.PASSAGES, passages),
  add: (passage: Passage) => {
    passageStore.save([passage, ...passageStore.getAll()])
    pushRow('passages', passage.id, passage)
  },
  update: (id: string, patch: Partial<Passage>) => {
    const passages = passageStore.getAll().map(p => p.id === id ? { ...p, ...patch } : p)
    passageStore.save(passages)
    const updated = passages.find(p => p.id === id)
    if (updated) pushRow('passages', id, updated)
  },
  remove: (id: string) => {
    passageStore.save(passageStore.getAll().filter(p => p.id !== id))
    deleteRow('passages', id)
  },
}

export const dailySentenceStore = {
  getAll: (): DailySentence[] => load(KEYS.DAILY_SENTENCES, []),
  save:   (items: DailySentence[]) => save(KEYS.DAILY_SENTENCES, items),
  add:    (item: DailySentence) => {
    dailySentenceStore.save([item, ...dailySentenceStore.getAll()])
    pushRow('daily_sentences', item.id, item)
  },
  update: (id: string, patch: Partial<DailySentence>) => {
    const items = dailySentenceStore.getAll().map(s => s.id === id ? { ...s, ...patch } : s)
    dailySentenceStore.save(items)
    const updated = items.find(s => s.id === id)
    if (updated) pushRow('daily_sentences', id, updated)
  },
  remove: (id: string) => {
    dailySentenceStore.save(dailySentenceStore.getAll().filter(s => s.id !== id))
    deleteRow('daily_sentences', id)
  },
}

export const statsStore = {
  get: (): UserStats => load(KEYS.STATS, {
    streak: 0,
    lastStudyDate: '',
    totalXP: 0,
    vocabCount: 0,
    passageCount: 0,
    reviewsCompleted: 0,
  }),
  update: (patch: Partial<UserStats>) => {
    const next = { ...statsStore.get(), ...patch }
    save(KEYS.STATS, next)
    pushStats(next)
  },
  addXP: (amount: number) => {
    const s = statsStore.get()
    const today = new Date().toDateString()
    const isNewDay = s.lastStudyDate !== today
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const streak = isNewDay ? (s.lastStudyDate === yesterday ? s.streak + 1 : 1) : s.streak
    statsStore.update({ totalXP: s.totalXP + amount, lastStudyDate: today, streak })
  },
}

// ─── Login sync: pull cloud, merge with local, upload local-only items ──────────
// Union by id (cloud wins on conflict) so a user's existing browser data is
// imported on first login, and their data follows them across devices after.

function mergeById<T extends { id: string }>(cloud: T[], local: T[]): { merged: T[]; localOnly: T[] } {
  const byId = new Map<string, T>()
  local.forEach(item => byId.set(item.id, item))
  cloud.forEach(item => byId.set(item.id, item)) // cloud wins
  const cloudIds = new Set(cloud.map(c => c.id))
  const localOnly = local.filter(l => !cloudIds.has(l.id))
  return { merged: [...byId.values()], localOnly }
}

export async function syncOnLogin(userId: string): Promise<void> {
  setSyncUser(userId)
  if (!supabase) return

  const [v, p, d, s] = await Promise.all([
    supabase.from('vocab').select('data'),
    supabase.from('passages').select('data'),
    supabase.from('daily_sentences').select('data'),
    supabase.from('stats').select('data').eq('user_id', userId).maybeSingle(),
  ])

  // Vocab
  const cloudVocab = (v.data ?? []).map(r => r.data as VocabWord)
  const rv = mergeById(cloudVocab, vocabStore.getAll())
  vocabStore.save(rv.merged)
  rv.localOnly.forEach(w => pushRow('vocab', w.id, w))

  // Passages
  const cloudPassages = (p.data ?? []).map(r => r.data as Passage)
  const rp = mergeById(cloudPassages, passageStore.getAll())
  passageStore.save(rp.merged)
  rp.localOnly.forEach(x => pushRow('passages', x.id, x))

  // Daily sentences
  const cloudSentences = (d.data ?? []).map(r => r.data as DailySentence)
  const rd = mergeById(cloudSentences, dailySentenceStore.getAll())
  dailySentenceStore.save(rd.merged)
  rd.localOnly.forEach(x => pushRow('daily_sentences', x.id, x))

  // Stats — keep whichever has more XP, then make sure cloud has a copy
  const cloudStats = s.data?.data as UserStats | undefined
  const localStats = statsStore.get()
  const winner = (cloudStats && cloudStats.totalXP > localStats.totalXP) ? cloudStats : localStats
  save(KEYS.STATS, winner)
  pushStats(winner)
}

// Clear local cache on sign-out so the next user starts clean.
export function clearLocalData() {
  if (typeof window === 'undefined') return
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  setSyncUser(null)
}
