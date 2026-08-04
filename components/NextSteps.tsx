'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NextStep = {
  href: string
  label: string
  icon: LucideIcon
  color?: string
}

// A compact "continue the learning loop" bar shown after a result.
// Discover → See examples → Use in a sentence → Pronounce it → Review later
export default function NextSteps({ heading = 'Your next step', steps }: { heading?: string; steps: NextStep[] }) {
  return (
    <div style={{
      marginTop: 14,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        {heading}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {steps.map(({ href, label, icon: Icon, color }) => (
          <Link key={href + label} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--surface)', border: `1px solid ${color ? color + '55' : 'var(--border)'}`,
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, color: 'var(--text)',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = color || 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = color ? color + '55' : 'var(--border)')}
            >
              <Icon size={15} style={{ color: color || 'var(--accent2)' }} />
              {label}
              <ArrowRight size={13} style={{ color: 'var(--muted)' }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
