//frontend/app/components/canvas.tsx

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { isNear, getProximityVolume, Player } from "./SpatialManger";
import { ProximityVideoPanel } from "./ProximityVideoPanel";
import axios from "axios";
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND;
interface Player {
  userId: string;
  x: number;
  y: number;
}

interface CanvasProps {
  roomId: string;
  socket: WebSocket;
  messages: string[];
  sendMessage: (data: object) => void;
  width: number;
  height: number;
  elements: any[];
  initialUserId: string;                                    // ← new
  initialSpawn: { x: number; y: number };                  // ← new
  initialUsers: { userId: string; x: number; y: number }[]; // ← new
  avatarMap: Record<string, string>;
  onAvatarNeeded: (userId: string) => void;
}
const imageCache: Record<string, HTMLImageElement> = {};
export function Canvas(props: CanvasProps) {
  const userIdRef = useRef<string>(props.initialUserId); 
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userId, setUserId] = useState<string>(props.initialUserId);
  const [canvasSize, setCanvasSize] = useState({ width: props.width, height: props.height });
  const { initiateCall, disconnectFrom, setUserVolume, toggleVideo,
        handleSignaling, peerConnections, localStream, isVideoOn,
        remoteStreams, proximityGroup } = useWebRTC(props.socket, userId);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');
  
  
  async function sendInvite() {
  if (!inviteUsername.trim()) return;
  setInviteStatus('sending');
  const token = localStorage.getItem('token');
  try {
    await axios.post(`${BackendAPI}/api/v1/user/invite`, {
      username: inviteUsername.trim(),
      spaceId: props.roomId,
      spaceName: props.roomId, // or pass a spaceName prop if you have it
    }, { headers: { Authorization: `Bearer ${token}` } });
    setInviteStatus('sent');
    setInviteUsername('');
    setTimeout(() => { setInviteStatus('idle'); setShowInvite(false); }, 2000);
  } catch (e: any) {
    setInviteError(e?.response?.data?.message || 'Failed to send invite');
    setInviteStatus('error');
    setTimeout(() => { setInviteStatus('idle'); setInviteError(''); }, 3000);
  }
}
  


const tileSize = 50;
  const playersRef = useRef<Record<string, Player>>({});
  const lastMoveTime = useRef<number>(0);
  const MOVE_COOLDOWN_MS = 120;
  const isTileBlocked = useCallback((x: number, y: number) => {
    return props.elements?.some((e: any) => e.x === x && e.y === y && e.element?.static);
  }, [props.elements]);
  const [players, setPlayers] = useState<Record<string, Player>>(() => {
    const initial: Record<string, Player> = {};
    props.initialUsers.forEach(u => { initial[u.userId] = u; });
    initial[props.initialUserId] = {
      userId: props.initialUserId,
      x: props.initialSpawn.x,
      y: props.initialSpawn.y,
    };
    return initial;
  });
  
  // Handle window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);


  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  // canvas.tsx


useEffect(() => {
  if (!props.socket) return;

  const handleMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);

    switch (data.type) {

      case "user-joined": {
        const { userId: joinedId, x, y } = data.payload;
        setPlayers((prev) => ({
          ...prev,
          [joinedId]: { userId: joinedId, x, y },
        }));
        props.onAvatarNeeded(joinedId);
        break;
      }

      case "movement": {
        const { userId: movingId, x, y } = data.payload;
        setPlayers((prev) => {
          if (movingId === userIdRef.current) return prev; // ignore own movement echoes
          return {
            ...prev,
            [movingId]: { ...prev[movingId], x, y },
          };
        });
        break;
      }

      case "movement-rejected": {
        const { x, y } = data.payload;
        setPlayers((prev) => ({
          ...prev,
          [userIdRef.current]: { ...prev[userIdRef.current], x, y },
        }));
        break;
      }

      case "user-left": {
        const { userId: leftId } = data.payload;
        setPlayers((prev) => {
          const updated = { ...prev };
          delete updated[leftId];
          return updated;
        });
        break;
      }

      case "signaling": {
        handleSignaling(data.payload.fromUserId, data.payload.signal);
        break;
      }
      case "user-left": {
        const { userId: leftId } = data.payload;
        disconnectFrom(leftId);   // ← clean up WebRTC
        setPlayers((prev) => {
          const updated = { ...prev };
          delete updated[leftId];
          return updated;
        });
        break;
}
    }
  };

  props.socket.addEventListener("message", handleMessage);
  return () => props.socket.removeEventListener("message", handleMessage);
}, [props.socket]);


  const move = useCallback((dx: number, dy: number) => {
  const now = Date.now();
  if (now - lastMoveTime.current < MOVE_COOLDOWN_MS) return; // ← throttle
  lastMoveTime.current = now;
  const activeId = userIdRef.current;
  const current = players[activeId];
  if (!activeId || !current) return;

  const newX = current.x + dx;
  const newY = current.y + dy;
  if (newX < 0 || newX >= props.width || newY < 0 || newY >= props.height) return;
  if (isTileBlocked(newX, newY)) return;

  const updatedMe: Player = { userId: activeId, x: newX, y: newY };

  setPlayers((prev) => ({ ...prev, [activeId]: updatedMe }));
  props.sendMessage({ type: "move", payload: { x: newX, y: newY, userId: activeId } });

  // Proximity voice chat
  Object.values(playersRef.current).forEach((otherPlayer) => {
    if (otherPlayer.userId === activeId) return;

    const near = isNear(updatedMe, otherPlayer);
    const alreadyConnected = !!peerConnections.current?.[otherPlayer.userId];

    if (near && !alreadyConnected) {
      initiateCall(otherPlayer.userId);                         // connect
    } else if (!near && alreadyConnected) {
      disconnectFrom(otherPlayer.userId);                       // disconnect
    } else if (near && alreadyConnected) {
      const vol = getProximityVolume(updatedMe, otherPlayer);
      setUserVolume(otherPlayer.userId, vol);                   // fade volume
    }
  });
}, [players, props.sendMessage, initiateCall, disconnectFrom, setUserVolume]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showInvite) return; // Don't move if invite panel is open
      switch (e.key) {
        case "ArrowUp":
        case "w": 
        case "W":
          e.preventDefault();
          move(0, -1); 
          break;
        case "ArrowDown":
        case "s": 
        case "S":
          e.preventDefault();
          move(0, 1); 
          break;
        case "ArrowLeft":
        case "a": 
        case "A":
          e.preventDefault();
          move(-1, 0); 
          break;
        case "ArrowRight":
        case "d": 
        case "D":
          e.preventDefault();
          move(1, 0); 
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move,showInvite]);

  // Drawing effect
  useEffect(() => {
    console.log("Current Elements in Canvas:", props.elements);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const activeId = userIdRef.current;
    const currentUser = players[activeId];
    if (!currentUser) return;
    const others = Object.values(players).filter((p) => p.userId !== activeId);


    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Camera position - center on current user
    const camX = (currentUser?.x ?? 0) * tileSize - canvas.width / 2;
    const camY = (currentUser?.y ?? 0) * tileSize - canvas.height / 2;

    // Draw grid
    ctx.strokeStyle = "rgba(0,245,255,0.08)";
    ctx.lineWidth = 1;
    // Calculate where the first line should start based on camera offset
    const offsetX = -camX % tileSize;
    const offsetY = -camY % tileSize;
    
    // Vertical lines
    for (let x = offsetX; x < canvas.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = offsetY; y < canvas.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Replace 100 with your actual space width/height if passed in props
    const spaceWidth = props.width;
    const spaceHeight = props.height;
    ctx.strokeStyle = "#ff3366"; // Red border for world limits
    ctx.lineWidth = 4;
    ctx.strokeRect(
      0 - camX, 
      0 - camY, 
      spaceWidth * tileSize, 
      spaceHeight * tileSize
    );
    // 3. Draw Static Elements (Walls/Chairs)
    const drawImage = (url: string, x: number, y: number) => {
    if (!imageCache[url]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
            imageCache[url] = img;
            // This force-triggers the useEffect to run again once the image is ready
            setImagesLoaded(prev => prev + 1);
        };
        img.onerror = () => {
          console.error('Failed to load element image:', url); // ← add this
        };
        return;
      }
    ctx.drawImage(imageCache[url], x, y, tileSize, tileSize);
};

// 3. Update the loop that draws elements
props.elements?.forEach((e: any) => {
  const ex = e.x * tileSize - camX;
  const ey = e.y * tileSize - camY;

  if (e.element?.static) {
    // Static/wall — solid red block
    ctx.fillStyle = 'rgba(255,51,102,0.85)';
    ctx.fillRect(ex, ey, tileSize, tileSize);
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 0.5, ey + 0.5, tileSize - 1, tileSize - 1);
  } else {
    // Dynamic/walkable — faint cyan tint
    ctx.fillStyle = 'rgba(0,245,255,0.15)';
    ctx.fillRect(ex, ey, tileSize, tileSize);
    ctx.strokeStyle = 'rgba(0,245,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 0.5, ey + 0.5, tileSize - 1, tileSize - 1);
  }
});
    // Draw other players
    others.forEach((p) => {
      const px = p.x * tileSize - camX ;
      const py = p.y * tileSize - camY ;
      
      // Only draw if within canvas bounds (with some margin)
      if (px > -tileSize && px < canvas.width + tileSize && py > -tileSize && py < canvas.height + tileSize) {
        const avatarUrl = props.avatarMap[p.userId];
        if (avatarUrl) {
          // Draw avatar image
          if (!imageCache[avatarUrl]) {
            const img = new Image();
            img.src = avatarUrl;
            img.onload = () => { imageCache[avatarUrl] = img; setImagesLoaded(prev => prev + 1); };
          } else {
            // Shadow/glow ring
            ctx.save();
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 12;
            ctx.drawImage(imageCache[avatarUrl], px, py, tileSize, tileSize);
            ctx.restore();
          }
        } else {
          // Fallback circle
          ctx.beginPath();
          ctx.fillStyle = '#0088ff';
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw user ID
        ctx.fillStyle = 'rgba(3,5,8,0.8)';
        ctx.fillRect(px, py - 18, tileSize, 16);
        ctx.fillStyle = '#7ab8d4';
        ctx.font = 'bold 10px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        if (p.userId) {
            ctx.fillText(p.userId.slice(0, 6), px + tileSize / 2, py - 6);
        }
      }
    });

    // Draw current user — with their avatar
  if (currentUser) {
    const px = currentUser.x * tileSize - camX;
    const py = currentUser.y * tileSize - camY;
    const avatarUrl = props.avatarMap[activeId];

    if (avatarUrl && imageCache[avatarUrl]) {
      // Glow ring for self
      ctx.save();
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 16;
      ctx.drawImage(imageCache[avatarUrl], px, py, tileSize, tileSize);
      ctx.restore();

      // Cyan border
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
    } else if (avatarUrl) {
      // Load it
      if (!imageCache[avatarUrl]) {
        const img = new Image();
        img.src = avatarUrl;
        img.onload = () => { imageCache[avatarUrl] = img; setImagesLoaded(prev => prev + 1); };
      }
      // While loading, draw placeholder
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(px + 5, py + 5, tileSize - 10, tileSize - 10);
    } else {
      // No avatar set — neon green square
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.fillRect(px + 5, py + 5, tileSize - 10, tileSize - 10);
      ctx.shadowBlur = 0;
    }

    // "YOU" tag above
    ctx.fillStyle = 'rgba(3,5,8,0.85)';
    ctx.fillRect(px, py - 20, tileSize, 18);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py - 20, tileSize, 18);
    ctx.fillStyle = '#00f5ff';
    ctx.font = 'bold 10px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px + tileSize / 2, py - 7);
  }
},[players, canvasSize, props.elements, imagesLoaded]);

  return (
  <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#030508' }}>
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="absolute top-0 left-0 cursor-crosshair"
      tabIndex={0}
    />

    {/* Top HUD bar */}
    <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4"
      style={{
        background: 'linear-gradient(180deg, rgba(3,5,8,0.95) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(0,245,255,0.08)'
      }}>
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--neon-green)', boxShadow: '0 0 6px var(--neon-green)' }} />
        <span className="font-display text-xs" style={{ color: 'var(--neon-cyan)', letterSpacing: '0.2em' }}>
          METAVERSE_2D
        </span>
      </div>
      <div className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>
        SPACE: {props.roomId.slice(0, 12).toUpperCase()}
      </div>
    </div>

    {/* Move instructions */}
    <div className="absolute top-12 left-4 font-mono-hud text-xs px-3 py-2 rounded-sm"
      style={{
        background: 'rgba(6,12,18,0.85)',
        border: '1px solid var(--border-dim)',
        color: 'var(--text-dim)',
        backdropFilter: 'blur(4px)'
      }}>
      <span style={{ color: 'var(--neon-cyan)' }}>WASD</span> / ARROWS — MOVE
    </div>

    {/* Player position HUD */}
    <div className="absolute bottom-4 left-4 font-mono-hud text-xs px-3 py-2 rounded-sm"
      style={{
        background: 'rgba(6,12,18,0.85)',
        border: '1px solid var(--border-dim)',
        color: 'var(--text-dim)',
        backdropFilter: 'blur(4px)'
      }}>
      {(() => {
        const p = players[userIdRef.current];
        return p ? (
          <>
            <span style={{ color: 'var(--neon-cyan)' }}>POS</span>{' '}
            X:<span style={{ color: 'var(--neon-green)' }}>{p.x}</span>{' '}
            Y:<span style={{ color: 'var(--neon-green)' }}>{p.y}</span>
          </>
        ) : null;
      })()}
    </div>

    {/* Player count */}
    <div className="absolute top-12 right-4 font-mono-hud text-xs px-3 py-2 rounded-sm"
      style={{
        background: 'rgba(6,12,18,0.85)',
        border: '1px solid var(--border-dim)',
        color: 'var(--text-dim)',
        backdropFilter: 'blur(4px)'
      }}>
      <span style={{ color: 'var(--neon-amber)' }}>ONLINE</span>{' '}
      {Object.keys(players).length}
    </div>
    <button
    onClick={() => setShowInvite(v => !v)}
      className="absolute font-mono-hud text-xs px-3 py-2 rounded-sm transition-all"
      style={{
        top: '0px', right: '5px', // sits below the ONLINE counter... 
        // actually place it to the left of ONLINE:
        //top: '48px', right: '120px',
        background: 'rgba(6,12,18,0.85)',
        border: '1px solid rgba(0,255,136,0.3)',
        color: 'var(--neon-green)',
        backdropFilter: 'blur(4px)',
      }}>
      + INVITE
    </button>
    {/* Invite panel */}
{showInvite && (
  <div className="absolute font-mono-hud z-50"
    style={{
      top: '30px', right: '5px',
      background: 'rgba(6,12,18,0.97)',
      border: '1px solid rgba(0,245,255,0.2)',
      backdropFilter: 'blur(12px)',
      width: 280,
      boxShadow: '0 0 40px rgba(0,245,255,0.08)',
    }}>
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'rgba(0,245,255,0.1)' }}>
      <div>
        <div className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>// INVITE_PLAYER</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--neon-cyan)' }}>Send a world invite</div>
      </div>
      <button onClick={() => setShowInvite(false)}
        className="text-xs px-2 py-1 transition-all"
        style={{ color: 'var(--text-dim)', border: '1px solid var(--border-dim)' }}>
        ✕
      </button>
    </div>

    <div className="p-4 space-y-3">
      <div>
        <label className="block text-xs mb-1.5 tracking-widest" style={{ color: 'var(--text-dim)' }}>
          USERNAME
        </label>
        <input
          value={inviteUsername}
          onChange={e => setInviteUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendInvite()}
          placeholder="enter_username"
          autoFocus
          className="w-full px-3 py-2 text-xs outline-none"
          style={{
            background: 'rgba(0,245,255,0.03)',
            border: '1px solid var(--border-dim)',
            color: 'var(--text-primary)',
            caretColor: 'var(--neon-cyan)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--neon-cyan)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-dim)'}
        />
      </div>

      {inviteStatus === 'error' && (
        <div className="text-xs px-3 py-2"
          style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366' }}>
          ✕ {inviteError}
        </div>
      )}

      {inviteStatus === 'sent' && (
        <div className="text-xs px-3 py-2"
          style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: 'var(--neon-green)' }}>
          ✓ INVITE SENT
        </div>
      )}

      <button
        onClick={sendInvite}
        disabled={inviteStatus === 'sending' || !inviteUsername.trim()}
        className="w-full py-2.5 text-xs font-bold tracking-widest transition-all"
        style={{
          background: inviteUsername.trim() ? 'var(--neon-green)' : 'rgba(0,255,136,0.05)',
          color: inviteUsername.trim() ? 'var(--bg-void)' : 'var(--text-dim)',
          border: `1px solid ${inviteUsername.trim() ? 'transparent' : 'rgba(0,255,136,0.15)'}`,
          cursor: inviteUsername.trim() ? 'pointer' : 'not-allowed',
        }}>
        {inviteStatus === 'sending' ? 'SENDING...' : '▶ SEND INVITE'}
      </button>
    </div>
  </div>
)}

    <ProximityVideoPanel
      localStream={localStream}
      isVideoOn={isVideoOn}
      remoteStreams={remoteStreams}
      proximityGroup={proximityGroup}
      onToggleVideo={toggleVideo}
    />
  </div>
);
}