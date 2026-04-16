'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
}
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND
export default function HomeDashboard() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [currentAvatarName, setCurrentAvatarName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter(); 

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/signup'); return; }

    // Load avatars + current user in parallel
    Promise.all([
      axios.get(`${BackendAPI}/api/v1/avatars`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${BackendAPI}/api/v1/user/me`,  { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([avatarRes, meRes]) => {
      setAvatars(avatarRes.data.avatars || []);
      if (meRes.data.avatarId) {
        setSelectedId(meRes.data.avatarId);
        setCurrentAvatarUrl(meRes.data.avatarUrl);
        setCurrentAvatarName(meRes.data.avatarName);
      }
    }).catch(() => router.push('/signup'));
  }, [router]);

  async function saveAvatar() {
    if (!selectedId) return;
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${BackendAPI}/api/v1/user/metadata`,
        { avatarId: selectedId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const chosen = avatars.find(a => a.id === selectedId);
      setCurrentAvatarUrl(chosen?.imageUrl ?? null);
      setCurrentAvatarName(chosen?.name ?? null);
      setSaved(true);
      router.push('/create_space');
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  }

  const selectedAvatar = avatars.find(a => a.id === selectedId);
  const previewAvatar = hoveredId ? avatars.find(a => a.id === hoveredId) : selectedAvatar;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-void)' }}>
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Radial glow at center */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,245,255,0.04) 0%, transparent 70%)'
      }} />

      {/* Top nav */}
      <header className="flex-row relative z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: 'rgba(0,245,255,0.1)', background: 'rgba(3,5,8,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: 'var(--neon-green)' }} />
          <span className="font-display text-base font-black tracking-widest" style={{ color: 'var(--neon-cyan)', textShadow: '0 0 15px rgba(0,245,255,0.5)' }}>
            METAVERSE_2D
          </span>
        </div>
        <div className="flex items-center gap-6">
          {currentAvatarUrl && (
            <div className="flex flex-col items-center gap-2">
              <img src={currentAvatarUrl} className="w-7 h-7 rounded-sm"
                style={{ border: '1px solid rgba(0,255,136,0.5)', imageRendering: 'pixelated' }} />
              <span className="font-mono-hud text-xs" style={{ color: 'var(--neon-green)' }}>
                {currentAvatarName}
              </span>
            </div>
          )}
    
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* LEFT — Avatar preview panel */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r p-6 gap-6"
          style={{ borderColor: 'rgba(0,245,255,0.08)', background: 'rgba(6,12,18,0.6)', backdropFilter: 'blur(8px)' }}>

          <div>
            <div className="font-mono-hud text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>
              // IDENTITY_MODULE
            </div>
            <h2 className="font-display text-xl font-black" style={{ color: 'var(--neon-cyan)' }}>
              YOUR AVATAR
            </h2>
          </div>

          {/* Big preview */}
          <div className="relative flex items-center justify-center rounded-sm overflow-hidden"
            style={{
              height: 200,
              background: 'var(--bg-panel)',
              border: `1px solid ${previewAvatar ? 'rgba(0,245,255,0.4)' : 'rgba(0,245,255,0.1)'}`,
              boxShadow: previewAvatar ? '0 0 30px rgba(0,245,255,0.08)' : 'none',
              transition: 'all 0.3s ease'
            }}>
            {/* Corner dots */}
            {['top-1.5 left-1.5','top-1.5 right-1.5','bottom-1.5 left-1.5','bottom-1.5 right-1.5'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} w-1.5 h-1.5`}
                style={{ background: 'var(--neon-cyan)', opacity: previewAvatar ? 0.8 : 0.2 }} />
            ))}

            {previewAvatar ? (
              <div className="flex flex-col items-center gap-3 ">
                <img
                  src={previewAvatar.imageUrl}
                  style={{
                    width: 100, height: 100,
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 0 12px rgba(0,245,255,0.4))',
                    transition: 'all 0.2s ease'
                  }}
                />
                <div className="text-center">
                  <div className="font-display text-sm font-bold" style={{ color: 'var(--neon-cyan)' }}>
                    {previewAvatar.name}
                  </div>
                  <div className="font-mono-hud text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    ID: {previewAvatar.id.slice(0, 8)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="font-mono-hud text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                SELECT AN<br />AVATAR
              </div>
            )}

            {/* Scan animation */}
            {previewAvatar && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.6), transparent)',
                  animation: 'scan 3s linear infinite'
                }} />
              </div>
            )}
          </div>

          {/* Stats display */}
          <div className="space-y-2">
            {[
              { label: 'VOICE_CHAT', value: 'ENABLED', color: 'var(--neon-green)' },
              { label: 'VIDEO_CALL', value: 'PROXIMITY', color: 'var(--neon-amber)' },
              { label: 'MOVEMENT', value: 'WASD', color: 'var(--neon-cyan)' },
            ].map(stat => (
              <div key={stat.label} className="flex justify-between items-center px-3 py-2"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.07)' }}>
                <span className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>{stat.label}</span>
                <span className="font-mono-hud text-xs" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Save button */}
          <button
            onClick={saveAvatar}
            disabled={saving || !selectedId}
            className="w-full py-3 font-display text-sm font-bold tracking-widest transition-all duration-200 relative overflow-hidden"
            style={{
              background: saved ? 'rgba(0,255,136,0.2)' : selectedId ? 'var(--neon-cyan)' : 'rgba(0,245,255,0.05)',
              color: saved ? 'var(--neon-green)' : selectedId ? 'var(--bg-void)' : 'var(--text-dim)',
              border: `1px solid ${saved ? 'var(--neon-green)' : selectedId ? 'transparent' : 'var(--border-dim)'}`,
              boxShadow: saved ? 'var(--glow-green)' : selectedId && !saving ? 'var(--glow-cyan)' : 'none',
              cursor: selectedId ? 'pointer' : 'not-allowed',
            }}>
            {saved ? '✓ AVATAR SAVED' : saving ? 'SAVING...' : 'CONFIRM AVATAR'}
          </button>
        </div>

        {/* RIGHT — Avatar grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <div className='flex-1'>

              <div className="flex flex-row justify-between items-center  font-mono-hud text-xs tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>
                <div>// SELECT_CHARACTER [{avatars.length} AVAILABLE]</div>
                <div className=''><button onClick={() => router.push('/create_space')}
                  className="font-mono-hud text-xs px-4 py-2 transition-all"
                  style={{
                    color: 'var(--neon-cyan)',
                    border: '1px solid rgba(0,245,255,0.3)',
                    background: 'rgba(0,245,255,0.05)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.12)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(0,245,255,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.05)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}>
                  ENTER WORLDS →
                </button></div>
              </div>
              
              <h1 className="font-display text-3xl font-black"
                style={{ color: 'var(--neon-cyan)', textShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
                CHOOSE YOUR IDENTITY
              </h1>
              <div className="h-px mt-3 w-64" style={{ background: 'linear-gradient(90deg, var(--neon-cyan), transparent)' }} />
              
            </div>
            
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {avatars.map((avatar, i) => {
              const isSelected = selectedId === avatar.id;
              const isHovered = hoveredId === avatar.id;

              return (
                <button
                  key={avatar.id}
                  onClick={() => setSelectedId(avatar.id)}
                  onMouseEnter={() => setHoveredId(avatar.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="relative flex flex-col items-center gap-2 p-3 transition-all duration-200 group"
                  style={{
                    background: isSelected
                      ? 'rgba(0,245,255,0.1)'
                      : isHovered
                        ? 'rgba(0,245,255,0.05)'
                        : 'var(--bg-card)',
                    border: `1px solid ${isSelected
                      ? 'var(--neon-cyan)'
                      : isHovered
                        ? 'rgba(0,245,255,0.3)'
                        : 'rgba(0,245,255,0.08)'}`,
                    boxShadow: isSelected
                      ? '0 0 20px rgba(0,245,255,0.15), inset 0 0 20px rgba(0,245,255,0.05)'
                      : 'none',
                    animationDelay: `${i * 0.03}s`,
                  }}>

                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center"
                      style={{ background: 'var(--neon-cyan)' }}>
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="var(--bg-void)" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Avatar image */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.name}
                      style={{
                        width: 56, height: 56,
                        imageRendering: 'pixelated',
                        filter: isSelected
                          ? 'drop-shadow(0 0 8px rgba(0,245,255,0.7))'
                          : isHovered
                            ? 'drop-shadow(0 0 4px rgba(0,245,255,0.4))'
                            : 'none',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </div>

                  {/* Name */}
                  <span className="font-mono-hud text-xs text-center leading-tight"
                    style={{ color: isSelected ? 'var(--neon-cyan)' : 'var(--text-secondary)' }}>
                    {avatar.name.toUpperCase()}
                  </span>

                  {/* Bottom glow bar when selected */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: 'var(--neon-cyan)', boxShadow: '0 0 6px var(--neon-cyan)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}