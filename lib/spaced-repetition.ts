// SM-2 algorithm for spaced repetition
export function sm2(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  repetitions: number,
  easeFactor: number,
  interval: number
): { nextInterval: number; nextRepetitions: number; nextEaseFactor: number; nextReview: number } {
  let nextEaseFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  let nextRepetitions = repetitions
  let nextInterval = interval

  if (quality < 3) {
    nextRepetitions = 0
    nextInterval = 1
  } else {
    nextRepetitions = repetitions + 1
    if (repetitions === 0) nextInterval = 1
    else if (repetitions === 1) nextInterval = 6
    else nextInterval = Math.round(interval * easeFactor)
  }

  const nextReview = Date.now() + nextInterval * 24 * 60 * 60 * 1000
  return { nextInterval, nextRepetitions, nextEaseFactor, nextReview }
}

export function isDue(nextReview: number): boolean {
  return Date.now() >= nextReview
}

export function getDueCount(items: { nextReview: number }[]): number {
  return items.filter(i => isDue(i.nextReview)).length
}
