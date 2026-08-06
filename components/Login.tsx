'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Mail } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true); setError(''); setNotice('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setNotice('Account created! If email confirmation is on, check your inbox — otherwise you can sign in now.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // AuthProvider picks up the session automatically
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 15, color: 'var(--accent2)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>BizEnglish</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>AI Coach</div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {mode === 'signin' ? 'Welcome to BizEnglish' : 'Create your account'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          {mode === 'signin' ? 'Sign in — or sign up below if you’re new.' : 'Your vocabulary and progress, on any device.'}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button className="btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</div>}
        {notice && <div style={{ color: '#16a34a', fontSize: 13, marginTop: 12 }}>{notice}</div>}

        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 18, textAlign: 'center' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
