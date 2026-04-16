//apps/frontend/app/components/ProximityVideoPanel.tsx
"use client";
import { useEffect, useRef } from "react";
import type { RemoteStream } from "../hooks/useWebRTC";

interface Props {
  localStream: MediaStream | null;
  isVideoOn: boolean;
  remoteStreams: Record<string, RemoteStream>;
  proximityGroup: Set<string>;
  onToggleVideo: () => void;
}

function VideoTile({ stream, hasVideo, label }: { stream: MediaStream; hasVideo: boolean; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-sm flex-shrink-0"
      style={{
        width: 148, height: 112,
        border: `1px solid ${hasVideo ? 'rgba(0,255,136,0.4)' : 'rgba(0,245,255,0.2)'}`,
        background: 'var(--bg-deep)',
        boxShadow: hasVideo ? '0 0 15px rgba(0,255,136,0.1)' : 'none'
      }}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center font-display text-xs font-bold"
            style={{ background: 'rgba(0,245,255,0.1)', color: 'var(--neon-cyan)', border: '1px solid var(--border-dim)' }}>
            {label.slice(0, 2).toUpperCase()}
          </div>
          <div className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>AUDIO ONLY</div>
        </div>
      )}
      {/* Scan line overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)' }} />
      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 font-mono-hud text-xs"
        style={{ background: 'rgba(3,5,8,0.85)', color: 'var(--text-secondary)', borderTop: '1px solid rgba(0,245,255,0.1)' }}>
        {label.slice(0, 10)}
      </div>
      {!hasVideo && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded-sm"
          style={{ background: 'rgba(255,51,102,0.3)', border: '1px solid rgba(255,51,102,0.5)' }}>
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#ff3366' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
    </div>
  );
}

function LocalTile({ stream, isVideoOn }: { stream: MediaStream | null; isVideoOn: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-sm flex-shrink-0"
      style={{
        width: 148, height: 112,
        border: '1px solid rgba(0,245,255,0.5)',
        background: 'var(--bg-deep)',
        boxShadow: '0 0 20px rgba(0,245,255,0.1)'
      }}>
      {isVideoOn && stream ? (
        <video ref={videoRef} autoPlay playsInline muted
          className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-sm flex items-center justify-center font-display text-xs font-bold"
            style={{ background: 'rgba(0,245,255,0.15)', color: 'var(--neon-cyan)', border: '1px solid var(--neon-cyan)', boxShadow: '0 0 10px rgba(0,245,255,0.2)' }}>
            YOU
          </div>
          <div className="font-mono-hud text-xs" style={{ color: 'var(--neon-cyan)', opacity: 0.6 }}>LOCAL</div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)' }} />
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 font-mono-hud text-xs"
        style={{ background: 'rgba(3,5,8,0.85)', color: 'var(--neon-cyan)', borderTop: '1px solid rgba(0,245,255,0.2)' }}>
        YOU (LOCAL)
      </div>
      {/* Live indicator */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
        style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid rgba(0,255,136,0.4)' }}>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--neon-green)' }} />
        <span className="font-mono-hud" style={{ fontSize: '0.55rem', color: 'var(--neon-green)' }}>LIVE</span>
      </div>
    </div>
  );
}

export function ProximityVideoPanel({ localStream, isVideoOn, remoteStreams, proximityGroup, onToggleVideo }: Props) {
  if (proximityGroup.size === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50 animate-slide-in-right">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-sm"
        style={{ background: 'rgba(6,12,18,0.95)', border: '1px solid var(--border-dim)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: 'var(--neon-green)' }} />
          <span className="font-mono-hud text-xs" style={{ color: 'var(--neon-cyan)' }}>PROXIMITY_CALL</span>
        </div>
        <span className="font-mono-hud text-xs" style={{ color: 'var(--text-dim)' }}>
          {proximityGroup.size + 1} CONNECTED
        </span>
      </div>

      {/* Video tiles */}
      <div className="flex flex-wrap gap-2 justify-end" style={{ maxWidth: 320 }}>
        <LocalTile stream={localStream} isVideoOn={isVideoOn} />
        {Object.values(remoteStreams).map(rs => (
          <VideoTile key={rs.userId} stream={rs.stream} hasVideo={rs.hasVideo} label={rs.userId} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-end">
        <button onClick={onToggleVideo}
          className="flex items-center gap-2 px-4 py-2 font-mono-hud text-xs transition-all duration-200"
          style={{
            background: isVideoOn ? 'rgba(0,245,255,0.15)' : 'rgba(6,12,18,0.9)',
            border: `1px solid ${isVideoOn ? 'var(--neon-cyan)' : 'var(--border-dim)'}`,
            color: isVideoOn ? 'var(--neon-cyan)' : 'var(--text-dim)',
            boxShadow: isVideoOn ? '0 0 15px rgba(0,245,255,0.2)' : 'none',
          }}>
          {isVideoOn ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
          {isVideoOn ? 'CAM_ON' : 'CAM_OFF'}
        </button>
      </div>
    </div>
  );
}