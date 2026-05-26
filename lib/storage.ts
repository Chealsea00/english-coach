import type { VocabWord, Passage, UserStats } from '@/types'

const KEYS = {
  VOCAB: 'bec_vocab',
  PASSAGES: 'bec_passages',
  STATS: 'bec_stats',
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

export const vocabStore = {
  getAll: (): VocabWord[] => load(KEYS.VOCAB, []),
  save: (words: VocabWord[]) => save(KEYS.VOCAB, words),
  add: (word: VocabWord) => {
    const words = vocabStore.getAll()
    vocabStore.save([word, ...words])
  },
  update: (id: string, patch: Partial<VocabWord>) => {
    const words = vocabStore.getAll().map(w => w.id === id ? { ...w, ...patch } : w)
    vocabStore.save(words)
  },
  remove: (id: string) => {
    vocabStore.save(vocabStore.getAll().filter(w => w.id !== id))
  },
}

export const passageStore = {
  getAll: (): Passage[] => load(KEYS.PASSAGES, []),
  save: (passages: Passage[]) => save(KEYS.PASSAGES, passages),
  add: (passage: Passage) => {
    const passages = passageStore.getAll()
    passageStore.save([passage, ...passages])
  },
  update: (id: string, patch: Partial<Passage>) => {
    const passages = passageStore.getAll().map(p => p.id === id ? { ...p, ...patch } : p)
    passageStore.save(passages)
  },
  remove: (id: string) => {
    passageStore.save(passageStore.getAll().filter(p => p.id !== id))
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
    save(KEYS.STATS, { ...statsStore.get(), ...patch })
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
