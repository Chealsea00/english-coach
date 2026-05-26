'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Mic, AlignLeft, RotateCcw, Zap } from 'lucide-react'

const links = [
  { href: '/', label: 'Home', icon: Zap },
  { href: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
  { href: '/sentences', label: 'Passages', icon: AlignLeft },
  { href: '/pronunciation', label: 'Pronunciation', icon: Mic },
  { href: '/review', label: 'Review', icon: RotateCcw },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav style={{
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      width: 220,
      minHeight: '100vh',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10,
    }}>
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          BizEnglish
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>AI Coach</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--text)' : 'var(--muted)',
              background: active ? 'var(--surface2)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              <Icon size={16} style={{ color: active ? 'var(--accent2)' : 'var(--muted)' }} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
