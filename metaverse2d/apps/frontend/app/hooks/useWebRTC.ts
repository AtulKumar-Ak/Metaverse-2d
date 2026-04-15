//frontend/app/hooks/useWebRTC.ts

import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function useWebRTC(socket: WebSocket | null, userId: string) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null); // ref so closures always see latest
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const audioElements = useRef<Record<string, HTMLAudioElement>>({});

    // 1. Get microphone once
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                setLocalStream(stream);
                localStreamRef.current = stream; // keep ref in sync
            })
            .catch(err => console.error("Microphone access denied", err));

        return () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // 2. Helper — always reads from ref so it never closes over stale stream
    const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
        // Clean up any existing connection first
        if (peerConnections.current[remoteUserId]) {
            peerConnections.current[remoteUserId].close();
            delete peerConnections.current[remoteUserId];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks using the REF not the state
        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        // Play remote audio with an AudioContext for volume control
        pc.ontrack = (event) => {
            if (audioElements.current[remoteUserId]) {
                audioElements.current[remoteUserId].srcObject = event.streams[0];
            } else {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.autoplay = true;
                audioElements.current[remoteUserId] = audio;
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.send(JSON.stringify({
                    type: "signaling",
                    payload: {
                        toUserId: remoteUserId,
                        signal: { type: "ice", candidate: event.candidate }
                    }
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

    // 3. Initiate a call to another user
    const initiateCall = useCallback(async (toUserId: string) => {
        if (!socket || peerConnections.current[toUserId]) return;

        const pc = createPeerConnection(toUserId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: "signaling",
            payload: { toUserId, signal: { type: "offer", sdp: offer.sdp } }
        }));
    }, [socket, createPeerConnection]);

    // 4. Disconnect from a user (call when they move out of range or leave)
    const disconnectFrom = useCallback((remoteUserId: string) => {
        peerConnections.current[remoteUserId]?.close();
        delete peerConnections.current[remoteUserId];

        if (audioElements.current[remoteUserId]) {
            audioElements.current[remoteUserId].srcObject = null;
            delete audioElements.current[remoteUserId];
        }
    }, []);

    // 5. Set volume for a specific user (0.0 to 1.0) for spatial effect
    const setUserVolume = useCallback((remoteUserId: string, volume: number) => {
        const audio = audioElements.current[remoteUserId];
        if (audio) audio.volume = Math.max(0, Math.min(1, volume));
    }, []);

    // 6. Handle incoming signals
    const handleSignaling = useCallback(async (fromUserId: string, signal: any) => {
        if (signal.type === "offer") {
            const pc = createPeerConnection(fromUserId);
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket?.send(JSON.stringify({
                type: "signaling",
                payload: { toUserId: fromUserId, signal: { type: "answer", sdp: answer.sdp } }
            }));

        } else if (signal.type === "answer") {
            const pc = peerConnections.current[fromUserId];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal));

        } else if (signal.type === "ice") {
            const pc = peerConnections.current[fromUserId];
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }, [socket, createPeerConnection]);

    // 7. Cleanup all on unmount
    useEffect(() => {
        return () => {
            Object.keys(peerConnections.current).forEach(disconnectFrom);
        };
    }, [disconnectFrom]);

    return { localStream, initiateCall, disconnectFrom, setUserVolume, handleSignaling, peerConnections };
}