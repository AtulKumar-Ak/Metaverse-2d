//apps/frontend/app/components/authpage.tsx
"use client"
import axios from 'axios'
import { useRef, useState } from "react"
import { useRouter } from 'next/navigation'
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND
export function AuthPage({ signIn }: { signIn: boolean }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();


  async function submitHandler() {
    setLoading(true);
    setError("");
    const username = nameRef.current?.value || ""
    const type = typeRef.current?.value || "user"
    const password = passRef.current?.value || ""
    const payload = signIn ? { username, password } : { username, type, password }
    console.log({BackendAPI})
    const authapi = signIn
      ? `${BackendAPI}/api/v1/signin`
      : `${BackendAPI}/api/v1/signup`
    try {
      const res = await axios.post(authapi, payload)
      localStorage.setItem("token", res.data.token);
      router.push(signIn ? '/' : '/');
    } catch (e) {
      setError("Authentication failed. Check your credentials.")
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-void)' }}>

      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />

      {/* Glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 70%)' }} />

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2"
        style={{ borderColor: 'var(--neon-cyan)', opacity: 0.4 }} />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2"
        style={{ borderColor: 'var(--neon-cyan)', opacity: 0.4 }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2"
        style={{ borderColor: 'var(--neon-cyan)', opacity: 0.4 }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2"
        style={{ borderColor: 'var(--neon-cyan)', opacity: 0.4 }} />

      <div className="relative w-full max-w-md px-4 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="font-mono-hud text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
            METAVERSE_2D // {signIn ? 'AUTH_SIGNIN' : 'AUTH_SIGNUP'}
          </div>
          <h1 className="font-display text-4xl font-black mb-2 animate-flicker"
            style={{ color: 'var(--neon-cyan)', textShadow: '0 0 30px rgba(0,245,255,0.6)' }}>
            {signIn ? 'ENTER' : 'REGISTER'}
          </h1>
          <div className="h-px w-32 mx-auto mt-3"
            style={{ background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)' }} />
        </div>

        {/* Form panel */}
        <div className="relative p-8 rounded-sm"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-dim)',
            boxShadow: '0 0 40px rgba(0,245,255,0.05), inset 0 0 40px rgba(0,0,0,0.5)'
          }}>

          {/* Panel corner accents */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-3 h-3`}
              style={{ background: 'var(--neon-cyan)', opacity: 0.7 }} />
          ))}

          <div className="space-y-5">
            <HudInput ref={nameRef} label="USERNAME" type="text" placeholder="enter_callsign" />
            {!signIn && (
              <HudInput ref={typeRef} label="ROLE" type="text" placeholder="user / admin" />
            )}
            <HudInput ref={passRef} label="PASSWORD" type="password" placeholder="••••••••••" />

            {error && (
              <div className="font-mono-hud text-xs px-3 py-2 rounded"
                style={{ color: 'var(--neon-red)', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)' }}>
                ⚠ {error}
              </div>
            )}

            <button onClick={submitHandler} disabled={loading}
              className="w-full py-3 mt-2 font-display text-sm font-bold tracking-widest transition-all duration-300 relative overflow-hidden group"
              style={{
                background: loading ? 'rgba(0,245,255,0.1)' : 'transparent',
                color: 'var(--neon-cyan)',
                border: '1px solid var(--neon-cyan)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,245,255,0.2)'
              }}>
              <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"
                style={{ background: 'rgba(0,245,255,0.1)' }} />
              <span className="relative">{loading ? 'AUTHENTICATING...' : (signIn ? 'INITIATE_LOGIN' : 'CREATE_ACCOUNT')}</span>
            </button>
          </div>

          <div className="mt-6 text-center font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>
            {signIn ? (
              <span>NO ACCOUNT? <a href="/signup" style={{ color: 'var(--neon-cyan)' }} className="hover:underline">REGISTER</a></span>
            ) : (
              <span>HAVE ACCOUNT? <a href="/signin" style={{ color: 'var(--neon-cyan)' }} className="hover:underline">LOGIN</a></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable HUD input
import { forwardRef } from "react"
const HudInput = forwardRef<HTMLInputElement, { label: string; type: string; placeholder: string }>(
  ({ label, type, placeholder }, ref) => (
    <div>
      <label className="block font-mono-hud text-xs mb-1 tracking-widest"
        style={{ color: 'var(--text-dim)' }}>{label}</label>
      <input ref={ref} type={type} placeholder={placeholder}
        className="w-full px-4 py-3 font-mono-hud text-sm outline-none transition-all duration-200"
        style={{
          background: 'rgba(0,245,255,0.03)',
          border: '1px solid var(--border-dim)',
          color: 'var(--text-primary)',
          caretColor: 'var(--neon-cyan)',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--neon-cyan)';
          e.target.style.boxShadow = '0 0 15px rgba(0,245,255,0.15)';
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border-dim)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  )
)
HudInput.displayName = 'HudInput';