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
  wordRoot?: {
    root:    string        // e.g. "empir-"
    origin:  string        // e.g. "Ancient Greek"
    meaning: string        // e.g. "experience, trial"
    prefix:  string | null // e.g. "em-  ·  Greek en-, meaning 'in'"  — null if none
    suffix:  string | null // e.g. "-al  ·  adjective suffix, 'pertaining to'" — null if none
  }
  relatedWords?: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
  topic: string
  createdAt: number
  nextReview: number
  interval: number
  repetitions: number
  easeFactor: number
  favorited: boolean
  highlighted?: boolean   // ⭐ user-marked as high-priority / daily-use
  tags?: string[]         // user-defined custom labels
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
  highlighted?: boolean   // ⭐ user-marked as high-priority
  tags?: string[]         // user-defined custom labels
}

export interface DailySentence {
  id: string
  text: string
  inputType?: 'english' | 'chinese'   // which language the user originally typed
  chineseTranslation: string
  tone: string
  register: string
  topic?: string          // AI-classified category, mirrors VocabWord.topic
  keyPhrases: { phrase: string; meaning: string; chineseMeaning: string }[]
  stressedWords: string[]
  naturalTips: string[]
  pronunciationNote: string
  createdAt: number
  nextReview: number
  interval: number
  repetitions: number
  easeFactor: number
  highlighted?: boolean   // ⭐ user-marked as high-priority
  tags?: string[]         // user-defined custom labels
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
