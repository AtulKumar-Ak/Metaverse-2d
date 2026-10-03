//apps/frontend/app/create_space/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND || 'http://localhost:3000';
const PREVIEW_TILE = 8; // tiny tile size for map thumbnail preview

interface MapOption {
  id: string;
  name: string;
  thumbnail: string;
  dimensions: string;
  elementCount: number;
}

interface SpaceEntry {
  id: string;
  name: string;
  dimensions: string;
  thumbnail?: string;
}

export default function CreateSpacePage() {
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState('100x100');
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<SpaceEntry[]>([]);
  const [maps, setMaps] = useState<MapOption[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'worlds'>('create');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/signup') as any; return; }

    // Check admin role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'Admin') setIsAdmin(true);
    } catch {}

    Promise.all([
      axios.get(`${BackendAPI}/api/v1/space/all`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${BackendAPI}/api/v1/user/maps`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([spaceRes, mapRes]) => {
      setSpaces(spaceRes.data.spaces || []);
      setMaps(mapRes.data.maps || []);
    }).catch((err) => {console.error('Failed to load data:', err);});
  }, []);

  function selectMap(map: MapOption | null) {
    if (!map) {
      setSelectedMapId(null);
      setDimensions('100x100');
      return;
    }
    setSelectedMapId(map.id);
    setDimensions(map.dimensions);
  }

  async function handleSubmit() {
    if (!name.trim()) { alert('Enter a world name'); return; }
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const payload: any = { name: name.trim(), dimensions };
      if (selectedMapId) payload.mapId = selectedMapId;
      const res = await axios.post(`${BackendAPI}/api/v1/space`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push(`/canvas/${res.data.spaceId}`);
    } catch {
      alert('Failed to create space');
    } finally {
      setLoading(false);
    }
  }

  const selectedMap = maps.find(m => m.id === selectedMapId);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-void)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,245,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,245,255,0.03) 0%, transparent 70%)'
      }} />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: 'rgba(0,245,255,0.1)', background: 'rgba(3,5,8,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: 'var(--neon-green)' }} />
          <span className="font-display text-base tracking-widest" style={{ color: 'var(--neon-cyan)' }}>
            METAVERSE_2D
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => router.push('/admin/map-builder')}
              className="font-mono-hud text-xs px-4 py-2 transition-all"
              style={{ color: 'var(--neon-amber)', border: '1px solid rgba(255,170,0,0.35)', background: 'rgba(255,170,0,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,170,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,170,0,0.06)'; }}>
              ⚙ MAP BUILDER
            </button>
          )}
          <button onClick={() => router.push('/')}
            className="font-mono-hud text-xs px-3 py-2 transition-all"
            style={{ color: 'var(--text-dim)', border: '1px solid var(--border-dim)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--neon-cyan)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; }}>
            ← HOME
          </button>
        </div>
      </header>

      <div className="relative flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-8 gap-6">

        {/* Page title */}
        <div className="animate-fade-in-up">
          <div className="font-mono-hud text-xs mb-1 tracking-widest" style={{ color: 'var(--text-dim)' }}>
            // WORLD_CREATION_TERMINAL
          </div>
          <h1 className="font-display text-4xl font-black animate-flicker"
            style={{ color: 'var(--neon-cyan)', textShadow: '0 0 30px rgba(0,245,255,0.4)' }}>
            DEPLOY WORLD
          </h1>
          <div className="h-px w-56 mt-2" style={{ background: 'linear-gradient(90deg, var(--neon-cyan), transparent)' }} />
        </div>

        <div className="flex flex-col xl:flex-row gap-6 flex-1">

          {/* ── LEFT: Map template picker ── */}
          <div className="flex-1 flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono-hud text-xs tracking-widest mb-0.5" style={{ color: 'var(--text-dim)' }}>
                  // SELECT_WORLD_TEMPLATE
                </div>
                <div className="font-ui text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Choose a map layout or start empty
                </div>
              </div>
              <span className="font-mono-hud text-xs px-2 py-1"
                style={{ color: 'var(--neon-amber)', border: '1px solid rgba(255,170,0,0.2)', background: 'rgba(255,170,0,0.05)' }}>
                {maps.length} MAPS
              </span>
            </div>

            {/* Empty world option */}
            <button onClick={() => selectMap(null)}
              className="flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 group "
              style={{
                background: !selectedMapId ? 'rgba(0,245,255,0.07)' : 'rgba(0,245,255,0.02)',
                border: `1px solid ${!selectedMapId ? 'var(--neon-cyan)' : 'rgba(0,245,255,0.08)'}`,
                boxShadow: !selectedMapId ? '0 0 20px rgba(0,245,255,0.08)' : 'none',
              }}>
              
              {!selectedMapId && (
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--neon-cyan)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="var(--bg-void)" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Maps grid */}
            {maps.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 font-mono-hud text-xs"
                style={{ color: 'var(--text-dim)', border: '1px dashed rgba(0,245,255,0.08)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.3 }}>◫</div>
                NO MAP TEMPLATES PUBLISHED YET
                {isAdmin && (
                  <button onClick={() => router.push('/admin/map-builder')}
                    className="mt-3 px-4 py-2 font-mono-hud text-xs transition-all"
                    style={{ color: 'var(--neon-amber)', border: '1px solid rgba(255,170,0,0.3)' }}>
                    → CREATE FIRST MAP
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {maps.map((map, i) => {
                  const isSelected = selectedMapId === map.id;
                  const [mw, mh] = map.dimensions.split('x').map(Number);
                  return (
                    <button key={map.id} onClick={() => selectMap(map)}
                      className="flex flex-col text-left transition-all duration-200 overflow-hidden cursor-pointer"
                      style={{
                        background: isSelected ? 'rgba(0,245,255,0.07)' : 'black',
                        border: `10px solid ${isSelected ? 'var(--neon-cyan)' : 'rgba(0,245,255,0.07)'}`,
                        boxShadow: isSelected ? '0 0 25px rgba(0,245,255,0.1)' : 'none',
                        animationDelay: `${i * 0.04}s`,
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,245,255,0.25)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,245,255,0.07)'; }}>

                      {/* Thumbnail */}
                      <div className="relative w-full overflow-hidden"
                        style={{ height: 64, background: 'var(--bg-deep)' }}>
                        <img
                          src={map.thumbnail}
                          alt={map.name}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated', opacity: 0.85 }}
                          onError={e => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/shapes/svg?seed=${map.id}&backgroundColor=060c12`;
                          }}
                        />
                        {/* Overlay with dimensions */}
                        <div className="absolute inset-0"
                          style={{ background: 'linear-gradient(0deg, rgba(3,5,8,0.8) 0%, transparent 60%)' }} />
                        <div className="absolute bottom-1.5 left-2 font-mono-hud"
                          style={{ fontSize: '0.6rem', color: 'rgba(0,245,255,0.7)' }}>
                          {map.dimensions} TILES
                        </div>
                        <div className="absolute bottom-1.5 right-2 font-mono-hud"
                          style={{ fontSize: '0.6rem', color: 'var(--neon-amber)' }}>
                          {map.elementCount} EL
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center"
                            style={{ background: 'var(--neon-cyan)' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="var(--bg-void)" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {/* Scan line */}
                        <div className="absolute inset-0 pointer-events-none" style={{
                          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)'
                        }} />
                      </div>

                      {/* Info */}
                      <div className="px-2 py-1.5">
                        <div className="font-ui font-semibold text-xs mb-0 truncate"
                          style={{ color: isSelected ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                          {map.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-hud" style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>
                            {mw}×{mh} tiles
                          </span>
                           <span className="font-mono-hud" style={{ fontSize: '0.55rem', color: 'var(--neon-amber)' }}>
                            {map.elementCount} elements
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: World settings + my worlds ── */}
          <div className="xl:w-72 flex-shrink-0 flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

            {/* World settings panel */}
            <div className="p-5 rounded-sm"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)' }}>

              {/* Corner accents */}
              {['top-0 left-0','top-0 right-0','bottom-0 left-0','bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-2 h-2`}
                  style={{ background: 'var(--neon-cyan)', opacity: 0.5 }} />
              ))}

              <div className="font-mono-hud text-xs mb-4 tracking-widest" style={{ color: 'var(--text-dim)' }}>
                // WORLD_SETTINGS
              </div>

              <div className="space-y-4">
                {/* World name */}
                <div>
                  <label className="block font-mono-hud text-xs mb-1.5 tracking-widest" style={{ color: 'var(--text-dim)' }}>
                    WORLD_NAME *
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="my_headquarters"
                    className="w-full px-3 py-2.5 font-mono-hud text-sm outline-none transition-all"
                    style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', caretColor: 'var(--neon-cyan)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 12px rgba(0,245,255,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-dim)'; e.target.style.boxShadow = 'none'; }}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-mono-hud text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>
                      DIMENSIONS
                    </label>
                    {selectedMapId && (
                      <span className="font-mono-hud px-1.5 py-0.5" style={{ fontSize: '0.55rem', color: 'var(--neon-amber)', border: '1px solid rgba(255,170,0,0.3)', background: 'rgba(255,170,0,0.06)' }}>
                        ⚠ LOCKED TO MAP
                      </span>
                    )}
                  </div>
                  <input value={dimensions} onChange={e => setDimensions(e.target.value)}
                    placeholder="100x100"
                    disabled={!!selectedMapId}
                    className="w-full px-3 py-2.5 font-mono-hud text-sm outline-none transition-all"
                    style={{
                      background: selectedMapId ? 'rgba(0,245,255,0.01)' : 'rgba(0,245,255,0.03)',
                      border: '1px solid var(--border-dim)',
                      color: selectedMapId ? 'var(--text-dim)' : 'var(--text-primary)',
                      caretColor: 'var(--neon-cyan)',
                      cursor: selectedMapId ? 'not-allowed' : 'text',
                    }}
                    onFocus={e => { if (!selectedMapId) { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 12px rgba(0,245,255,0.12)'; }}}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-dim)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {!selectedMapId && (
                    <div className="mt-1 font-mono-hud" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                      format: WIDTHxHEIGHT (e.g. 100x100)
                    </div>
                  )}
                </div>

                {/* Selected template summary */}
                <div className="px-3 py-2.5" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.08)' }}>
                  <div className="font-mono-hud text-xs mb-1" style={{ color: 'var(--text-dim)' }}>TEMPLATE</div>
                  <div className="font-mono-hud text-sm font-bold" style={{ color: selectedMap ? 'var(--neon-cyan)' : 'var(--text-secondary)' }}>
                    {selectedMap ? selectedMap.name : 'Empty World'}
                  </div>
                  {selectedMap && (
                    <div className="mt-1 font-mono-hud" style={{ fontSize: '0.65rem', color: 'var(--neon-amber)' }}>
                      {selectedMap.elementCount} pre-placed elements included
                    </div>
                  )}
                </div>

                {/* Launch button */}
                <button onClick={handleSubmit} disabled={loading || !name.trim()}
                  className="w-full py-3.5 font-display text-sm font-bold tracking-widest transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: !name.trim() ? 'rgba(0,245,255,0.04)' : 'var(--neon-cyan)',
                    color: !name.trim() ? 'var(--text-dim)' : 'var(--bg-void)',
                    border: `1px solid ${!name.trim() ? 'var(--border-dim)' : 'transparent'}`,
                    boxShadow: name.trim() ? 'var(--glow-cyan)' : 'none',
                    cursor: name.trim() ? 'pointer' : 'not-allowed',
                  }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>
                      DEPLOYING...
                    </span>
                  ) : '▶ LAUNCH WORLD'}
                </button>
              </div>
            </div>

            {/* My worlds */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono-hud text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>
                  // MY_WORLDS
                </div>
                <span className="font-mono-hud text-xs px-2 py-0.5"
                  style={{ color: 'var(--text-dim)', border: '1px solid rgba(0,245,255,0.1)' }}>
                  {spaces.length}
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--neon-cyan) transparent' }}>
                {spaces.length === 0 ? (
                  <div className="font-mono-hud text-xs py-6 text-center"
                    style={{ color: 'var(--text-dim)', border: '1px dashed rgba(0,245,255,0.08)' }}>
                    NO WORLDS YET<br />
                    <span style={{ opacity: 0.5 }}>Create your first above ↑</span>
                  </div>
                ) : spaces.map(space => (
                  <div key={space.id}
                    className="group flex items-center justify-between px-3 py-3 cursor-pointer transition-all duration-150"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,245,255,0.07)' }}
                    onClick={() => router.push(`/canvas/${space.id}`)}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-green)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0,255,136,0.06)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,245,255,0.07)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}>
                    <div>
                      <div className="font-ui font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {space.name}
                      </div>
                      <div className="font-mono-hud mt-0.5" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                        {space.dimensions} • {space.id.slice(0, 8)}
                      </div>
                    </div>
                    <span className="font-mono-hud text-xs transition-colors"
                      style={{ color: 'var(--neon-green)' }}>
                      ENTER →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}