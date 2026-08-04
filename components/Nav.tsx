'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Mic, AlignLeft, RotateCcw, Zap, Library, MessageCircle, LogOut } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabaseConfigured } from '@/lib/supabase'

const links = [
  { href: '/', label: 'Home', icon: Zap },
  { href: '/vocabulary', label: 'Vocabulary', icon: BookOpen },
  { href: '/daily', label: 'Sentence Coach', icon: MessageCircle },
  { href: '/sentences', label: 'Passages', icon: AlignLeft },
  { href: '/pronunciation', label: 'Pronunciation', icon: Mic },
  { href: '/review', label: 'Review', icon: RotateCcw },
  { href: '/saved', label: 'Library', icon: Library },
]

export default function Nav() {
  const path = usePathname()
  const { user, signOut } = useAuth()
  return (
    <nav className="app-nav">
      <div className="app-nav-brand" style={{ padding: '0 20px 24px' }}>
        <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          BizEnglish
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>AI Coach</div>
      </div>
      <div className="app-nav-links">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} className="app-nav-link" style={{
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--text)' : 'var(--muted)',
              background: active ? 'var(--surface2)' : 'transparent',
            }}>
              <Icon size={16} style={{ color: active ? 'var(--accent2)' : 'var(--muted)', flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </div>

      {supabaseConfigured && user && (
        <div className="app-nav-foot">
          <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
          <button onClick={signOut} className="app-nav-link" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
            <LogOut size={16} style={{ flexShrink: 0 }} /> Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
