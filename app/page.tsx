'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { vocabStore, passageStore, statsStore } from '@/lib/storage'
import { getDueCount } from '@/lib/spaced-repetition'
import { BookOpen, Mic, AlignLeft, RotateCcw, Flame, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'

export default function Home() {
  const [stats, setStats] = useState({ streak: 0, totalXP: 0, vocabCount: 0, passageCount: 0, reviewsCompleted: 0 })
  const [dueCount, setDueCount] = useState(0)
  const [mastered, setMastered] = useState(0)

  useEffect(() => {
    const s = statsStore.get()
    const vocab = vocabStore.getAll()
    const passages = passageStore.getAll()
    setStats({ ...s, vocabCount: vocab.length, passageCount: passages.length })
    setDueCount(getDueCount([...vocab, ...passages]))
    // "Mastered" = reviewed successfully enough to have graduated past early intervals
    setMastered([...vocab, ...passages].filter(i => i.repetitions >= 2).length)
  }, [])

  // ── The one clear next action ──
  const primary = dueCount > 0
    ? { label: `Review ${dueCount} card${dueCount > 1 ? 's' : ''} due`, sub: 'Lock in what you already learned', href: '/review', cta: 'Start review' }
    : stats.vocabCount === 0
    ? { label: 'Learn your first expression', sub: 'Paste a word or idea to get started', href: '/vocabulary', cta: 'Get started' }
    : { label: 'Learn a new expression', sub: "You're all caught up on reviews — nice work", href: '/vocabulary', cta: 'Continue' }

  const featureCards = [
    { href: '/vocabulary', icon: BookOpen, title: 'Vocabulary', desc: 'Advanced business expressions', count: `${stats.vocabCount} saved`, color: '#6c63ff' },
    { href: '/daily', icon: AlignLeft, title: 'Sentence Coach', desc: 'Say your idea naturally in English', count: 'Practice anytime', color: '#5b5bd6' },
    { href: '/pronunciation', icon: Mic, title: 'Pronunciation', desc: 'Record & get AI feedback', count: 'Practice anytime', color: '#22c55e' },
    { href: '/review', icon: RotateCcw, title: 'Review', desc: 'Spaced repetition', count: dueCount > 0 ? `${dueCount} due` : 'All caught up', color: dueCount > 0 ? '#eab308' : '#22c55e' },
  ]

  const progress = [
    { icon: CheckCircle2, label: 'Expressions mastered', value: mastered, color: '#16a34a' },
    { icon: Flame, label: 'Day streak', value: stats.streak, color: '#f97316' },
    { icon: TrendingUp, label: 'Reviews done', value: stats.reviewsCompleted, color: '#5b5bd6' },
  ]

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 900 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Welcome back</h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>Sound fluent, natural, and executive in every meeting.</p>
        </div>

        {/* ── Primary action — the hero ── */}
        <Link href={primary.href} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
            borderRadius: 16, padding: '26px 28px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(59,111,212,0.25)',
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Your next step</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{primary.label}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{primary.sub}</div>
            </div>
            <div style={{
              flexShrink: 0, background: 'rgba(255,255,255,0.18)', color: '#fff',
              borderRadius: 10, padding: '12px 18px', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {primary.cta} <ArrowRight size={17} />
            </div>
          </div>
        </Link>

        {/* ── Progress strip — quiet, supporting ── */}
        <div style={{ display: 'flex', gap: 24, padding: '4px 4px 0', marginBottom: 32, flexWrap: 'wrap' }}>
          {progress.map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={16} style={{ color }} />
              <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Explore</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {featureCards.map(({ href, icon: Icon, title, desc, count, color }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={19} style={{ color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                  <div style={{ fontSize: 11, color, fontWeight: 500, marginTop: 2 }}>{count}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
