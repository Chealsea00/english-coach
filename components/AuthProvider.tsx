'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { syncOnLogin, clearLocalData, setSyncUser } from '@/lib/storage'
import Login from '@/components/Login'
import { Loader2 } from 'lucide-react'

type AuthCtx = { user: User | null; signOut: () => Promise<void> }
const Ctx = createContext<AuthCtx>({ user: null, signOut: async () => {} })
export const useAuth = () => useContext(Ctx)

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>{children}</div>
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)   // initial session check done
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Local-only mode when Supabase isn't configured — app works as before.
    if (!supabaseConfigured || !supabase) { setReady(true); return }

    let active = true

    const handleSession = async (u: User | null) => {
      if (!active) return
      if (u) {
        setSyncing(true)
        try { await syncOnLogin(u.id) } catch (e) { console.warn('[auth] sync failed', e) }
        if (!active) return
        setSyncing(false)
      } else {
        setSyncUser(null)
      }
      setUser(u)
      setReady(true)
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session?.user ?? null))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user ?? null)
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    await supabase?.auth.signOut()
    clearLocalData()
    setUser(null)
  }

  // Local-only mode: no auth gate.
  if (!supabaseConfigured) return <Ctx.Provider value={{ user, signOut }}>{children}</Ctx.Provider>

  if (!ready) return <FullScreen><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /></FullScreen>
  if (!user) return <Login />
  if (syncing) return <FullScreen><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> <span style={{ marginLeft: 10 }}>Syncing your library…</span></FullScreen>

  return <Ctx.Provider value={{ user, signOut }}>{children}</Ctx.Provider>
}
