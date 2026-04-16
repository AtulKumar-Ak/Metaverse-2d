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

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ width: 160, height: 120 }}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={false}
          className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg font-bold">
            {label.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-2 text-white text-xs bg-black bg-opacity-50 px-1 rounded">
        {label.slice(0, 8)}
      </div>
      {!hasVideo && (
        <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
          {/* Camera off icon */}
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
      )}
    </div>
  );
}

function LocalTile({ stream, isVideoOn }: { stream: MediaStream | null; isVideoOn: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden" style={{ width: 160, height: 120 }}>
      {isVideoOn && stream ? (
        <video ref={videoRef} autoPlay playsInline muted // mute local to avoid echo
          className="w-full h-full object-cover scale-x-[-1]" /> // mirror local feed
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            YOU
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-2 text-white text-xs bg-black bg-opacity-50 px-1 rounded">
        You
      </div>
    </div>
  );
}

export function ProximityVideoPanel({ localStream, isVideoOn, remoteStreams, proximityGroup, onToggleVideo }: Props) {
  // Only show panel when in a proximity group
  if (proximityGroup.size === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
      {/* Video tiles */}
      <div className="flex flex-wrap gap-2 justify-end max-w-sm">
        <LocalTile stream={localStream} isVideoOn={isVideoOn} />
        {Object.values(remoteStreams).map(rs => (
          <VideoTile
            key={rs.userId}
            stream={rs.stream}
            hasVideo={rs.hasVideo}
            label={rs.userId}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onToggleVideo}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
            isVideoOn ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {isVideoOn ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Video On
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Video Off
            </>
          )}
        </button>

        <div className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-green-600 text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-7a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
          </svg>
          {proximityGroup.size + 1} in call
        </div>
      </div>
    </div>
  );
}