// apps/frontend/app/admin/map-builder/page.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND || 'http://localhost:3000';
const TILE = 36;

interface Element {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  static: boolean;
}

interface PlacedElement {
  elementId: string;
  x: number;
  y: number;
  imageUrl: string;
  isStatic: boolean;
}

type Tool = 'place' | 'erase' | 'fill';

const ELEMENT_CATEGORIES = [
  { id: 'wall',    label: 'WALLS',    color: '#ff3366' },
  { id: 'floor',   label: 'FLOOR',    color: '#00f5ff' },
  { id: 'object',  label: 'OBJECTS',  color: '#00ff88' },
];

export default function MapBuilder() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [placed, setPlaced] = useState<PlacedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [tool, setTool] = useState<Tool>('place');
  const [mapName, setMapName] = useState('');
  const [mapW, setMapW] = useState(25);
  const [mapH, setMapH] = useState(18);
  const [thumbnail, setThumbnail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [camOffset, setCamOffset] = useState({ x: 0, y: 0 });
  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffsetStart = useRef({ x: 0, y: 0 });

  // Check admin
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/signup'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'Admin') { alert('Admin access required'); router.push('/'); return; }
    } catch { router.push('/'); return; }

    axios.get(`${BackendAPI}/api/v1/admin/elements`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setElements(res.data.elements || [])).catch(() => {
      alert('Failed to load elements. Make sure you are admin and elements are seeded.');
    });
  }, []);

  // Pre-load images
  useEffect(() => {
    elements.forEach(el => {
      if (!imageCache.current[el.imageUrl]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = el.imageUrl;
        img.onload = () => { imageCache.current[el.imageUrl] = img; setImagesLoaded(p => p + 1); };
      }
    });
  }, [elements]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = mapW * TILE;
    const H = mapH * TILE;
    canvas.width = W;
    canvas.height = H;

    // Dark void background
    ctx.fillStyle = '#030508';
    ctx.fillRect(0, 0, W, H);

    // Subtle floor pattern
    ctx.fillStyle = 'rgba(0,245,255,0.015)';
    for (let x = 0; x < mapW; x++) {
      for (let y = 0; y < mapH; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(0,245,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapW; x++) {
      ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, H); ctx.stroke();
    }
    for (let y = 0; y <= mapH; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(W, y * TILE); ctx.stroke();
    }

    // Coordinate markers every 5 tiles
    ctx.fillStyle = 'rgba(0,245,255,0.2)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    for (let x = 0; x <= mapW; x += 5) {
      ctx.fillText(String(x), x * TILE + 2, 10);
    }
    ctx.textAlign = 'left';
    for (let y = 0; y <= mapH; y += 5) {
      ctx.fillText(String(y), 2, y * TILE + 10);
    }

    // Placed elements
    placed.forEach(p => {
      const img = imageCache.current[p.imageUrl];
      if (img) {
        ctx.drawImage(img, p.x * TILE, p.y * TILE, TILE, TILE);
        // Static overlay tint
        if (p.isStatic) {
          ctx.fillStyle = 'rgba(255,51,102,0.12)';
          ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
          ctx.strokeStyle = 'rgba(255,51,102,0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x * TILE + 0.5, p.y * TILE + 0.5, TILE - 1, TILE - 1);
        }
      } else {
        ctx.fillStyle = p.isStatic ? 'rgba(255,51,102,0.6)' : 'rgba(0,245,255,0.3)';
        ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
      }
    });

    // Hover cell
    if (hoveredCell) {
      const hx = hoveredCell.x * TILE;
      const hy = hoveredCell.y * TILE;

      if (tool === 'place' && selectedElement) {
        const img = imageCache.current[selectedElement.imageUrl];
        if (img) {
          ctx.globalAlpha = 0.55;
          ctx.drawImage(img, hx, hy, TILE, TILE);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = 'rgba(0,245,255,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2);
        // Glow
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 8;
        ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2);
        ctx.shadowBlur = 0;
      } else if (tool === 'erase') {
        ctx.fillStyle = 'rgba(255,51,102,0.25)';
        ctx.fillRect(hx, hy, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,51,102,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2);
      } else if (tool === 'fill') {
        ctx.fillStyle = 'rgba(255,170,0,0.2)';
        ctx.fillRect(hx, hy, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,170,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, TILE - 2, TILE - 2);
      }
    }

    // Map border
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 10;
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
    ctx.shadowBlur = 0;

  }, [placed, hoveredCell, tool, selectedElement, mapW, mapH, imagesLoaded]);

  const getCellFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX / TILE),
      y: Math.floor((e.clientY - rect.top) * scaleY / TILE),
    };
  }, []);

  const applyTool = useCallback((cell: { x: number; y: number }) => {
    if (cell.x < 0 || cell.x >= mapW || cell.y < 0 || cell.y >= mapH) return;

    if (tool === 'erase') {
      setPlaced(prev => prev.filter(p => !(p.x === cell.x && p.y === cell.y)));
      return;
    }
    if (tool === 'fill' && selectedElement) {
      // Flood fill — fill all empty cells
      setPlaced(prev => {
        const occupied = new Set(prev.map(p => `${p.x},${p.y}`));
        const newItems: PlacedElement[] = [];
        for (let x = 0; x < mapW; x++) {
          for (let y = 0; y < mapH; y++) {
            if (!occupied.has(`${x},${y}`)) {
              newItems.push({
                elementId: selectedElement.id,
                x, y,
                imageUrl: selectedElement.imageUrl,
                isStatic: selectedElement.static,
              });
            }
          }
        }
        return [...prev, ...newItems];
      });
      return;
    }
    if (tool === 'place' && selectedElement) {
      setPlaced(prev => {
        const without = prev.filter(p => !(p.x === cell.x && p.y === cell.y));
        return [...without, {
          elementId: selectedElement.id,
          x: cell.x, y: cell.y,
          imageUrl: selectedElement.imageUrl,
          isStatic: selectedElement.static,
        }];
      });
    }
  }, [tool, selectedElement, mapW, mapH]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) {
      // Middle mouse or alt = pan
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffsetStart.current = { ...camOffset };
      return;
    }
    isDragging.current = true;
    applyTool(getCellFromEvent(e));
  }, [applyTool, getCellFromEvent, camOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (cell.x >= 0 && cell.x < mapW && cell.y >= 0 && cell.y < mapH) {
      setHoveredCell(cell);
    } else {
      setHoveredCell(null);
    }
    if (isDragging.current && tool !== 'fill') applyTool(cell);
  }, [getCellFromEvent, mapW, mapH, applyTool, tool]);

  const handleMouseUp = () => { isDragging.current = false; isPanning.current = false; };

  async function saveMap() {
    if (!mapName.trim()) { alert('Enter a map name'); return; }
    if (placed.length === 0) { alert('Place at least one element'); return; }
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${BackendAPI}/api/v1/admin/map`, {
        name: mapName,
        dimensions: `${mapW}x${mapH}`,
        thumbnail: thumbnail || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(mapName)}&backgroundColor=030508`,
        defaultElements: placed.map(p => ({ elementId: p.elementId, x: p.x, y: p.y }))
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setPlaced([]);
      setMapName('');
      setThumbnail('');
    } catch {
      alert('Failed to save. Ensure your admin token is valid.');
    } finally {
      setSaving(false);
    }
  }

  const staticElements = elements.filter(e => e.static);
  const dynamicElements = elements.filter(e => !e.static);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-void)', fontFamily: 'var(--font-mono)' }}>
      {/* Fixed background grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,245,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b"
        style={{ borderColor: 'rgba(255,170,0,0.2)', background: 'rgba(3,5,8,0.97)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--neon-amber)', boxShadow: '0 0 10px var(--neon-amber)' }} />
          <span className="font-display text-sm tracking-widest" style={{ color: 'var(--neon-amber)' }}>
            ADMIN // MAP_BUILDER
          </span>
          <span className="font-mono-hud text-xs px-2 py-0.5" style={{ color: 'var(--text-dim)', border: '1px solid rgba(255,170,0,0.15)' }}>
            RESTRICTED_ACCESS
          </span>
        </div>

        {/* Center status */}
        <div className="flex items-center gap-4 font-mono-hud text-xs">
          <span style={{ color: 'var(--text-dim)' }}>
            CANVAS: <span style={{ color: 'var(--neon-cyan)' }}>{mapW}×{mapH}</span>
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            PLACED: <span style={{ color: 'var(--neon-amber)' }}>{placed.length}</span>
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            STATIC: <span style={{ color: '#ff3366' }}>{placed.filter(p => p.isStatic).length}</span>
          </span>
          {hoveredCell && (
            <span style={{ color: 'var(--text-dim)' }}>
              CURSOR: <span style={{ color: 'var(--neon-green)' }}>{hoveredCell.x},{hoveredCell.y}</span>
            </span>
          )}
        </div>

        <button onClick={() => router.push('/')}
          className="font-mono-hud text-xs px-3 py-1.5 transition-all"
          style={{ color: 'var(--text-dim)', border: '1px solid var(--border-dim)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--neon-cyan)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; }}>
          ← EXIT
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR — Element Palette ── */}
        <aside className="w-52 flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: 'rgba(0,245,255,0.07)', background: 'rgba(6,12,18,0.9)' }}>

          {/* Tools */}
          <div className="p-3 border-b" style={{ borderColor: 'rgba(0,245,255,0.07)' }}>
            <div className="font-mono-hud text-xs mb-2 tracking-widest" style={{ color: 'var(--text-dim)' }}>// TOOLS</div>
            <div className="grid grid-cols-3 gap-1">
              {([
                { id: 'place', icon: '✏', label: 'PLACE', color: 'var(--neon-cyan)' },
                { id: 'erase', icon: '✕', label: 'ERASE', color: '#ff3366' },
                { id: 'fill',  icon: '▦', label: 'FILL',  color: 'var(--neon-amber)' },
              ] as { id: Tool; icon: string; label: string; color: string }[]).map(t => (
                <button key={t.id} onClick={() => setTool(t.id)}
                  title={t.id === 'fill' ? 'Fill all empty cells with selected element' : undefined}
                  className="flex flex-col items-center py-2 gap-0.5 transition-all text-xs"
                  style={{
                    background: tool === t.id ? `${t.color}18` : 'transparent',
                    border: `1px solid ${tool === t.id ? t.color : 'rgba(0,245,255,0.08)'}`,
                    color: tool === t.id ? t.color : 'var(--text-dim)',
                  }}>
                  <span style={{ fontSize: '0.9rem' }}>{t.icon}</span>
                  <span className="font-mono-hud" style={{ fontSize: '0.55rem' }}>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-1 mt-2">
              <button onClick={() => setPlaced([])}
                className="flex-1 py-1.5 font-mono-hud text-xs transition-all"
                style={{ color: '#ff3366', border: '1px solid rgba(255,51,102,0.2)', background: 'rgba(255,51,102,0.05)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,102,0.12)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,102,0.05)'}>
                CLEAR ALL
              </button>
              <button
                onClick={() => {
                  // Undo last placed
                  setPlaced(prev => prev.slice(0, -1));
                }}
                className="px-3 py-1.5 font-mono-hud text-xs transition-all"
                style={{ color: 'var(--text-dim)', border: '1px solid var(--border-dim)' }}
                title="Undo last action">
                ↩
              </button>
            </div>
          </div>

          {/* Static elements (walls) */}
          <div className="p-3 border-b" style={{ borderColor: 'rgba(0,245,255,0.07)' }}>
            <div className="font-mono-hud text-xs mb-2 tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
              // STATIC
              <span className="px-1 py-0.5 font-mono-hud" style={{ fontSize: '0.55rem', color: '#ff3366', border: '1px solid rgba(255,51,102,0.3)', background: 'rgba(255,51,102,0.08)' }}>
                BLOCKS MOVEMENT
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {staticElements.map(el => {
                const isSel = selectedElement?.id === el.id;
                return (
                  <button key={el.id} onClick={() => { setSelectedElement(el); setTool('place'); }}
                    className="relative flex flex-col items-center gap-1 p-2 transition-all"
                    style={{
                      background: isSel ? 'rgba(255,51,102,0.15)' : 'rgba(255,51,102,0.03)',
                      border: `1px solid ${isSel ? 'rgba(255,51,102,0.7)' : 'rgba(255,51,102,0.15)'}`,
                      boxShadow: isSel ? '0 0 12px rgba(255,51,102,0.2)' : 'none',
                    }}>
                    {isSel && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5" style={{ background: '#ff3366' }} />}
                    <img src={el.imageUrl} style={{ width: 30, height: 30, imageRendering: 'pixelated' }} />
                    <span className="font-mono-hud text-center" style={{ fontSize: '0.55rem', color: isSel ? '#ff3366' : 'var(--text-dim)', lineHeight: 1.2 }}>
                      {el.id.slice(0, 6)}
                    </span>
                  </button>
                );
              })}
              {staticElements.length === 0 && (
                <div className="col-span-2 py-3 text-center font-mono-hud" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  No static elements.<br />Seed the DB first.
                </div>
              )}
            </div>
          </div>

          {/* Dynamic elements */}
          <div className="p-3">
            <div className="font-mono-hud text-xs mb-2 tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
              // DYNAMIC
              <span className="px-1 py-0.5 font-mono-hud" style={{ fontSize: '0.55rem', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.06)' }}>
                WALKABLE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {dynamicElements.map(el => {
                const isSel = selectedElement?.id === el.id;
                return (
                  <button key={el.id} onClick={() => { setSelectedElement(el); setTool('place'); }}
                    className="relative flex flex-col items-center gap-1 p-2 transition-all"
                    style={{
                      background: isSel ? 'rgba(0,245,255,0.12)' : 'rgba(0,245,255,0.02)',
                      border: `1px solid ${isSel ? 'rgba(0,245,255,0.6)' : 'rgba(0,245,255,0.08)'}`,
                      boxShadow: isSel ? '0 0 12px rgba(0,245,255,0.15)' : 'none',
                    }}>
                    {isSel && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5" style={{ background: 'var(--neon-cyan)' }} />}
                    <img src={el.imageUrl} style={{ width: 30, height: 30, imageRendering: 'pixelated' }} />
                    <span className="font-mono-hud text-center" style={{ fontSize: '0.55rem', color: isSel ? 'var(--neon-cyan)' : 'var(--text-dim)', lineHeight: 1.2 }}>
                      {el.id.slice(0, 6)}
                    </span>
                  </button>
                );
              })}
              {dynamicElements.length === 0 && (
                <div className="col-span-2 py-3 text-center font-mono-hud" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  No dynamic elements.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── CENTER — Canvas ── */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-auto p-4 gap-3"
          style={{ background: 'rgba(3,5,8,0.4)' }}>

          {/* Tool hint */}
          <div className="flex items-center gap-4 font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>
            <span>
              {tool === 'place' && selectedElement
                ? <><span style={{ color: 'var(--neon-cyan)' }}>PLACING</span> {selectedElement.id.slice(0, 8)} — {selectedElement.static ? <span style={{ color: '#ff3366' }}>STATIC</span> : <span style={{ color: 'var(--neon-green)' }}>DYNAMIC</span>}</>
                : tool === 'place'
                  ? <span style={{ color: 'var(--neon-amber)' }}>← SELECT AN ELEMENT</span>
                  : tool === 'erase'
                    ? <span style={{ color: '#ff3366' }}>ERASE MODE — click tiles to remove</span>
                    : <span style={{ color: 'var(--neon-amber)' }}>FILL MODE — fills all empty cells</span>
              }
            </span>
            <span style={{ opacity: 0.4 }}>DRAG TO PAINT</span>
          </div>

          {/* Canvas wrapper */}
          <div ref={containerRef} style={{ position: 'relative', boxShadow: '0 0 60px rgba(0,245,255,0.06), 0 0 120px rgba(0,0,0,0.8)' }}>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                maxWidth: 'min(100%, 900px)',
                maxHeight: 'calc(100vh - 160px)',
                cursor: tool === 'erase' ? 'crosshair' : tool === 'fill' ? 'cell' : 'default',
                imageRendering: 'pixelated',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setHoveredCell(null); isDragging.current = false; }}
              onContextMenu={e => e.preventDefault()}
            />
          </div>

          <div className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>
            RED BORDER = WORLD LIMIT  •  RED TINT = STATIC/WALL (blocks player)  •  GREEN = WALKABLE
          </div>
        </main>

        {/* ── RIGHT SIDEBAR — Map Config ── */}
        <aside className="w-60 flex-shrink-0 flex flex-col border-l overflow-y-auto"
          style={{ borderColor: 'rgba(0,245,255,0.07)', background: 'rgba(6,12,18,0.9)' }}>

          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,245,255,0.07)' }}>
            <div className="font-mono-hud text-xs mb-4 tracking-widest" style={{ color: 'var(--text-dim)' }}>// MAP_CONFIG</div>

            {/* Name */}
            <div className="mb-3">
              <label className="block font-mono-hud text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>MAP_NAME *</label>
              <input value={mapName} onChange={e => setMapName(e.target.value)}
                placeholder="office_floor_01"
                className="w-full px-3 py-2 font-mono-hud text-xs outline-none transition-all"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', caretColor: 'var(--neon-cyan)' }}
                onFocus={e => e.target.style.borderColor = 'var(--neon-cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>

            {/* Dimensions */}
            <div className="mb-3">
              <label className="block font-mono-hud text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>CANVAS_SIZE</label>
              <div className="grid grid-cols-2 gap-2">
                {([['W', mapW, setMapW], ['H', mapH, setMapH]] as [string, number, (v: number) => void][]).map(([lbl, val, setter]) => (
                  <div key={lbl}>
                    <div className="font-mono-hud mb-1" style={{ fontSize: '0.6rem', color: 'rgba(0,245,255,0.4)' }}>{lbl} (tiles)</div>
                    <input type="number" min={5} max={100} value={val}
                      onChange={e => setter(Math.max(5, Math.min(100, Number(e.target.value))))}
                      className="w-full px-2 py-1.5 font-mono-hud text-xs outline-none text-center"
                      style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--border-dim)', color: 'var(--neon-cyan)' }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 font-mono-hud text-xs" style={{ color: 'rgba(255,170,0,0.5)' }}>
                ⚠ Resizing clears placed elements outside bounds
              </div>
            </div>

            {/* Thumbnail */}
            <div className="mb-4">
              <label className="block font-mono-hud text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>THUMBNAIL_URL</label>
              <input value={thumbnail} onChange={e => setThumbnail(e.target.value)}
                placeholder="auto-generated if empty"
                className="w-full px-3 py-2 font-mono-hud text-xs outline-none transition-all"
                style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', caretColor: 'var(--neon-cyan)' }}
                onFocus={e => e.target.style.borderColor = 'var(--neon-cyan)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,245,255,0.07)' }}>
            <div className="font-mono-hud text-xs mb-3 tracking-widest" style={{ color: 'var(--text-dim)' }}>// STATS</div>
            <div className="space-y-1.5">
              {[
                { label: 'TOTAL PLACED',   value: placed.length,                                   color: 'var(--neon-cyan)' },
                { label: 'STATIC (WALLS)', value: placed.filter(p => p.isStatic).length,           color: '#ff3366' },
                { label: 'DYNAMIC',        value: placed.filter(p => !p.isStatic).length,          color: 'var(--neon-green)' },
                { label: 'TOTAL TILES',    value: mapW * mapH,                                      color: 'var(--text-secondary)' },
                { label: 'COVERAGE',       value: `${Math.round(placed.length / (mapW * mapH) * 100)}%`, color: 'var(--neon-amber)' },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center px-2 py-1.5"
                  style={{ background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.05)' }}>
                  <span className="font-mono-hud" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{s.label}</span>
                  <span className="font-mono-hud" style={{ fontSize: '0.65rem', color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,245,255,0.07)' }}>
            <div className="font-mono-hud text-xs mb-2 tracking-widest" style={{ color: 'var(--text-dim)' }}>// LEGEND</div>
            <div className="space-y-1.5 font-mono-hud" style={{ fontSize: '0.65rem' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 flex-shrink-0" style={{ background: 'rgba(255,51,102,0.6)', border: '1px solid #ff3366' }} />
                <span style={{ color: 'var(--text-dim)' }}>STATIC — blocks player movement</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 flex-shrink-0" style={{ background: 'rgba(0,245,255,0.2)', border: '1px solid rgba(0,245,255,0.4)' }} />
                <span style={{ color: 'var(--text-dim)' }}>DYNAMIC — walkable decoration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 flex-shrink-0" style={{ background: 'transparent', border: '2px solid #ff3366' }} />
                <span style={{ color: 'var(--text-dim)' }}>RED BORDER — world boundary</span>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="p-4 mt-auto">
            <button onClick={saveMap} disabled={saving || !mapName.trim()}
              className="w-full py-3 font-display text-sm font-bold tracking-widest transition-all duration-200"
              style={{
                background: saved
                  ? 'rgba(0,255,136,0.15)'
                  : mapName.trim()
                    ? 'var(--neon-amber)'
                    : 'rgba(255,170,0,0.05)',
                color: saved
                  ? 'var(--neon-green)'
                  : mapName.trim()
                    ? 'var(--bg-void)'
                    : 'var(--text-dim)',
                border: `1px solid ${saved ? 'var(--neon-green)' : mapName.trim() ? 'transparent' : 'var(--border-dim)'}`,
                boxShadow: saved ? 'var(--glow-green)' : mapName.trim() ? 'var(--glow-amber)' : 'none',
                cursor: mapName.trim() ? 'pointer' : 'not-allowed',
              }}>
              {saved ? '✓ MAP PUBLISHED' : saving ? 'SAVING...' : '▶ PUBLISH MAP'}
            </button>

            {saved && (
              <div className="mt-2 font-mono-hud text-xs text-center" style={{ color: 'var(--neon-green)' }}>
                Map available in /create_space
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}