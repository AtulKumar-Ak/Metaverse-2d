//apps/frontend/app/create_space/page.tsx
'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND;
export default function CreateSpacePage() {
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/signup') as any;
    // Load existing spaces
    axios.get(`${BackendAPI}/api/v1/space/all`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setSpaces(res.data.spaces || [])).catch(() => {});
  }, []);

  async function handleSubmit() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `${BackendAPI}/api/v1/space`,
        { name, dimensions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/canvas/${res.data.spaceId}`);
    } catch (err) {
      alert("Failed to create space");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      {/* Background grid */}
      <div className="fixed inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        pointerEvents: 'none'
      }} />

      {/* Top HUD bar */}
      <header className="relative border-b px-8 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--border-dim)', background: 'rgba(6,12,18,0.9)' }}>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: 'var(--neon-green)' }} />
          <span className="font-display text-lg" style={{ color: 'var(--neon-cyan)' }}>METAVERSE_2D</span>
        </div>
        <span className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>
          SPACE_MANAGEMENT // CONTROL_PANEL
        </span>
      </header>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Create new space */}
          <div className="animate-fade-in-up">
            <div className="font-mono-hud text-xs mb-2 tracking-widest" style={{ color: 'var(--text-dim)' }}>
              // CREATE_NEW_SPACE
            </div>
            <h2 className="font-display text-3xl font-black mb-8"
              style={{ color: 'var(--neon-cyan)', textShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
              DEPLOY WORLD
            </h2>

            <div className="space-y-5 p-6 rounded-sm"
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-dim)',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4)'
              }}>

              <div>
                <label className="block font-mono-hud text-xs mb-2 tracking-widest"
                  style={{ color: 'var(--text-dim)' }}>WORLD_NAME</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="my_space_station"
                  className="w-full px-4 py-3 font-mono-hud text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(0,245,255,0.03)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-primary)',
                    caretColor: 'var(--neon-cyan)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 15px rgba(0,245,255,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-dim)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label className="block font-mono-hud text-xs mb-2 tracking-widest"
                  style={{ color: 'var(--text-dim)' }}>DIMENSIONS <span style={{ color: 'var(--neon-amber)' }}>(e.g. 100x100)</span></label>
                <input value={dimensions} onChange={e => setDimensions(e.target.value)}
                  placeholder="100x100"
                  className="w-full px-4 py-3 font-mono-hud text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(0,245,255,0.03)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-primary)',
                    caretColor: 'var(--neon-cyan)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 15px rgba(0,245,255,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-dim)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 font-display text-sm font-bold tracking-widest transition-all duration-300 relative overflow-hidden group"
                style={{
                  color: 'var(--bg-void)',
                  background: loading ? 'rgba(0,245,255,0.5)' : 'var(--neon-cyan)',
                  boxShadow: loading ? 'none' : 'var(--glow-cyan)'
                }}>
                {loading ? 'DEPLOYING...' : '▶ LAUNCH WORLD'}
              </button>
            </div>
          </div>

          {/* Existing spaces */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="font-mono-hud text-xs mb-2 tracking-widest" style={{ color: 'var(--text-dim)' }}>
              // EXISTING_SPACES [{spaces.length}]
            </div>
            <h2 className="font-display text-3xl font-black mb-8"
              style={{ color: 'var(--neon-green)', textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
              MY WORLDS
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {spaces.length === 0 ? (
                <div className="font-mono-hud text-sm text-center py-12"
                  style={{ color: 'var(--text-dim)', border: '1px dashed var(--border-dim)' }}>
                  NO WORLDS FOUND<br />
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Create your first space →</span>
                </div>
              ) : spaces.map((space, i) => (
                <div key={space.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 group"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-dim)',
                    animationDelay: `${i * 0.05}s`
                  }}
                  onClick={() => router.push(`/canvas/${space.id}`)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-green)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(0,255,136,0.1)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}>
                  <div>
                    <div className="font-ui font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {space.name}
                    </div>
                    <div className="font-mono-hud text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {space.dimensions} • {space.id.slice(0, 8)}...
                    </div>
                  </div>
                  <span className="font-mono-hud text-xs group-hover:text-white transition-colors"
                    style={{ color: 'var(--neon-green)' }}>ENTER →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}