'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { vocabStore, passageStore, statsStore } from '@/lib/storage'
import { getDueCount } from '@/lib/spaced-repetition'
import { BookOpen, Mic, AlignLeft, RotateCcw, Flame, Star, TrendingUp } from 'lucide-react'

export default function Home() {
  const [stats, setStats] = useState({ streak: 0, totalXP: 0, vocabCount: 0, passageCount: 0, reviewsCompleted: 0 })
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    const s = statsStore.get()
    const vocab = vocabStore.getAll()
    const passages = passageStore.getAll()
    setStats({ ...s, vocabCount: vocab.length, passageCount: passages.length })
    setDueCount(getDueCount([...vocab, ...passages]))
  }, [])

  const featureCards = [
    { href: '/vocabulary', icon: BookOpen, title: 'Vocabulary', desc: 'Learn advanced business expressions', count: `${stats.vocabCount} words saved`, color: '#6c63ff' },
    { href: '/sentences', icon: AlignLeft, title: 'Passages', desc: 'Analyze paragraphs from meetings & magazines', count: `${stats.passageCount} passages saved`, color: '#a78bfa' },
    { href: '/pronunciation', icon: Mic, title: 'Pronunciation', desc: 'Record and get AI feedback on your speech', count: 'Practice anytime', color: '#22c55e' },
    { href: '/review', icon: RotateCcw, title: 'Review', desc: 'Spaced repetition for long-term retention', count: dueCount > 0 ? `${dueCount} cards due` : 'All caught up!', color: dueCount > 0 ? '#eab308' : '#22c55e' },
  ]

  return (
    <div style={{ display: 'flex' }}>
      <Nav />
      <main style={{ marginLeft: 220, padding: '40px 48px', flex: 1, maxWidth: 900 }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Business English AI Coach</h1>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 15 }}>Sound fluent, natural, and executive in every meeting.</p>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {[
            { icon: Flame, label: 'Day Streak', value: stats.streak, color: '#f97316' },
            { icon: Star, label: 'Total XP', value: stats.totalXP, color: '#eab308' },
            { icon: TrendingUp, label: 'Reviews Done', value: stats.reviewsCompleted, color: '#6c63ff' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {featureCards.map(({ href, icon: Icon, title, desc, count, color }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{desc}</div>
                <div style={{ fontSize: 12, color, fontWeight: 500 }}>{count}</div>
              </div>
            </Link>
          ))}
        </div>

        {dueCount > 0 && (
          <div style={{ marginTop: 24, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>You have {dueCount} cards due for review</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Keep your streak going!</div>
            </div>
            <Link href="/review"><button className="btn-primary">Start Review</button></Link>
          </div>
        )}
      </main>
    </div>
  )
}
