export interface VocabWord {
  id: string
  input: string
  inputType: 'english' | 'chinese'
  word: string
  ipa: string
  chineseMeaning: string
  englishDefinition: string
  businessExamples: string[]
  alternatives: { style: string; expression: string }[]
  collocations: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
  topic: string
  createdAt: number
  nextReview: number
  interval: number
  repetitions: number
  easeFactor: number
  favorited: boolean
}

export interface Passage {
  id: string
  text: string
  sourceLabel: string          // e.g. "HBR", "Team Meeting", "McKinsey"
  sourceType: 'meeting' | 'magazine' | 'newsletter' | 'paper' | 'other'
  chineseSummary: string
  tone: string                 // e.g. "executive", "strategic", "persuasive"
  keyPhrases: { phrase: string; meaning: string; chineseMeaning: string }[]
  notablePatterns: string[]    // sentence patterns worth imitating
  pronunciationFocus: string
  createdAt: number
  nextReview: number
  interval: number
  repetitions: number
  easeFactor: number
  favorited: boolean
}

export interface ReviewCard {
  type: 'vocab' | 'sentence'
  id: string
  question: string
  answer: string
  hint?: string
  mode: 'meaning' | 'pronunciation' | 'usage' | 'chinese-to-english'
}

export interface UserStats {
  streak: number
  lastStudyDate: string
  totalXP: number
  vocabCount: number
  passageCount: number
  reviewsCompleted: number
}
