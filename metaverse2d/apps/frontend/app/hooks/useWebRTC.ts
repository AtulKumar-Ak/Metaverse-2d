//apps/frontend/app/hooks/useWebRTC.ts
import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export interface RemoteStream {
  userId: string;
  stream: MediaStream;
  hasVideo: boolean;
}

export function useWebRTC(socket: WebSocket | null, userId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, RemoteStream>>({});
  const [proximityGroup, setProximityGroup] = useState<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const proximityGroupRef = useRef<Set<string>>(new Set());

  // 1. Init audio-only stream on mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        localStreamRef.current = stream;
        setLocalStream(stream);
      })
      .catch(err => console.error("Mic access denied:", err));

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, []);

  // 2. Toggle video on/off
  const toggleVideo = useCallback(async () => {
    if (isVideoOn) {
      // Turn video OFF — remove video tracks from all connections
      localStreamRef.current?.getVideoTracks().forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
        // Replace with null video track in all peer connections
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) pc.removeTrack(sender);
        });
      });
      setIsVideoOn(false);

      // Notify peers video is off
      socket?.send(JSON.stringify({
        type: "signaling",
        payload: {
          toUserId: "broadcast",
          signal: { type: "video-toggle", userId, hasVideo: false }
        }
      }));
    } else {
      // Turn video ON — add video track to all peer connections
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current?.addTrack(videoTrack);

        // Add to all existing peer connections via renegotiation
        Object.entries(peerConnections.current).forEach(async ([remoteUserId, pc]) => {
          pc.addTrack(videoTrack, localStreamRef.current!);
          // Renegotiate
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.send(JSON.stringify({
            type: "signaling",
            payload: { toUserId: remoteUserId, signal: { type: "offer", sdp: offer.sdp } }
          }));
        });

        setIsVideoOn(true);

        socket?.send(JSON.stringify({
          type: "signaling",
          payload: {
            toUserId: "broadcast",
            signal: { type: "video-toggle", userId, hasVideo: true }
          }
        }));
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
  }, [isVideoOn, socket, userId]);

  // 3. Create peer connection
  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    if (peerConnections.current[remoteUserId]) {
      peerConnections.current[remoteUserId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add all local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
      const hasVideo = remoteStream.getVideoTracks().length > 0;
      setRemoteStreams(prev => ({
        ...prev,
        [remoteUserId]: { userId: remoteUserId, stream: remoteStream, hasVideo }
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.send(JSON.stringify({
          type: "signaling",
          payload: { toUserId: remoteUserId, signal: { type: "ice", candidate: event.candidate } }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        disconnectFrom(remoteUserId);
      }
    };

    peerConnections.current[remoteUserId] = pc;
    return pc;
  }, [socket]);

  // 4. Connect to a user
  const initiateCall = useCallback(async (toUserId: string) => {
    if (!socket || peerConnections.current[toUserId] || toUserId === userId) return;

    const pc = createPeerConnection(toUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.send(JSON.stringify({
      type: "signaling",
      payload: { toUserId, signal: { type: "offer", sdp: offer.sdp } }
    }));

    // Add to proximity group
    const newGroup = new Set(proximityGroupRef.current).add(toUserId);
    proximityGroupRef.current = newGroup;
    setProximityGroup(new Set(newGroup));
  }, [socket, userId, createPeerConnection]);

  // 5. Disconnect from a user
  const disconnectFrom = useCallback((remoteUserId: string) => {
    peerConnections.current[remoteUserId]?.close();
    delete peerConnections.current[remoteUserId];

    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[remoteUserId];
      return updated;
    });

    const newGroup = new Set(proximityGroupRef.current);
    newGroup.delete(remoteUserId);
    proximityGroupRef.current = newGroup;
    setProximityGroup(new Set(newGroup));
  }, []);

  // 6. Set audio volume for spatial effect
  const setUserVolume = useCallback((remoteUserId: string, volume: number) => {
    const stream = remoteStreams[remoteUserId]?.stream;
    if (!stream) return;
    stream.getAudioTracks().forEach(track => {
      // Use AudioContext for volume control
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    });
  }, [remoteStreams]);

  // 7. Handle incoming signals
  const handleSignaling = useCallback(async (fromUserId: string, signal: any) => {
    if (signal.type === "video-toggle") {
      setRemoteStreams(prev => prev[fromUserId]
        ? { ...prev, [fromUserId]: { ...prev[fromUserId], hasVideo: signal.hasVideo } }
        : prev
      );
      return;
    }

    if (signal.type === "offer") {
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.send(JSON.stringify({
        type: "signaling",
        payload: { toUserId: fromUserId, signal: { type: "answer", sdp: answer.sdp } }
      }));

      const newGroup = new Set(proximityGroupRef.current).add(fromUserId);
      proximityGroupRef.current = newGroup;
      setProximityGroup(new Set(newGroup));

    } else if (signal.type === "answer") {
      await peerConnections.current[fromUserId]
        ?.setRemoteDescription(new RTCSessionDescription(signal));

    } else if (signal.type === "ice") {
      await peerConnections.current[fromUserId]
        ?.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }, [socket, createPeerConnection]);

  return {
    localStream,
    isVideoOn,
    remoteStreams,
    proximityGroup,
    peerConnections,
    initiateCall,
    disconnectFrom,
    setUserVolume,
    toggleVideo,
    handleSignaling,
  };
}