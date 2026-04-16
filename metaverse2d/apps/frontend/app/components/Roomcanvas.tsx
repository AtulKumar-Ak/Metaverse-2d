//frontend/app/components/Roomcanvas.tsx
"use client"
import { useEffect, useRef, useState } from "react"
import { Canvas } from './canvas'
import { useRouter } from "next/navigation"
import axios from "axios"

interface SpawnData {
  userId: string;
  x: number;
  y: number;
  users: { userId: string; x: number; y: number }[];
}
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND;
const WSBackend = process.env.NEXT_PUBLIC_WSBACKEND;


export function RoomCanvas({ roomId }: { roomId: string }) {
    const router = useRouter()
    const socketRef = useRef<WebSocket | null>(null)
    const [ready, setReady] = useState(false)
    const [worldData, setWorldData] = useState<{ width: number; height: number; elements: any[] } | null>(null)
    const [spawnData, setSpawnData] = useState<SpawnData | null>(null)
    const socketStateRef = useRef<WebSocket | null>(null)
    const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

    function handleAvatarNeeded(userId: string) {
      const token = localStorage.getItem("token")!;
      axios.get(`${BackendAPI}/api/v1/user/metadata/bulk?ids=[${userId}]`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        const a = res.data.avatars?.[0];
        if (a?.avatarId) {
          setAvatarMap(prev => ({ ...prev, [userId]: a.avatarId }));
        }
      });
    }


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/signup"); return; }

        axios.get(`${BackendAPI}/api/v1/space/${roomId}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            const [w, h] = res.data.dimensions.split("x").map(Number);
            setWorldData({ width: w, height: h, elements: res.data.elements });
        });

        const ws = new WebSocket(`${WSBackend}?token=${token}&roomId=${roomId}`)
        socketRef.current = ws
        socketStateRef.current = ws

        // Attach listener BEFORE onopen so we never miss a message
        ws.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "space-joined") {
                setSpawnData({
                    userId: data.payload.userId,
                    x: data.payload.spawn.x,
                    y: data.payload.spawn.y,
                    users: data.payload.users,
                });
                const token = localStorage.getItem("token")!;
                const allIds = [data.payload.userId, ...data.payload.users.map((u: any) => u.userId)];
                const idsParam = `[${allIds.join(",")}]`;
                axios.get(`${BackendAPI}/api/v1/user/metadata/bulk?ids=${idsParam}`, {
                  headers: { Authorization: `Bearer ${token}` }
                }).then(res => {
                  const map: Record<string, string> = {};
                  res.data.avatars.forEach((a: any) => {
                    if (a.avatarId) map[a.userId] = a.avatarId; // avatarId here is actually imageUrl from your route
                  });
                  setAvatarMap(map);
                }).catch(() => {});
            }
        });

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "join",
                payload: { spaceId: roomId, token },
            }))
        }

        ws.onerror = (err) => console.log("WS Error", err)
        ws.onclose = () => console.log("socket closed")

        return () => { ws.close() }
    }, [roomId, router])

    // Only show Canvas when we have BOTH world metadata AND spawn data
    useEffect(() => {
        if (worldData && spawnData) setReady(true)
    }, [worldData, spawnData])

    const sendMessage = (data: object) => {
        const ws = socketStateRef.current
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    };

    if (!ready || !worldData || !spawnData || !socketRef.current) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">
                Loading metaverse world...
            </div>
        )
    }

    return (
        <Canvas
            roomId={roomId}
            socket={socketRef.current}
            sendMessage={sendMessage}
            messages={[]}
            width={worldData.width}
            height={worldData.height}
            elements={worldData.elements}
            initialUserId={spawnData.userId}        // ← pass directly
            initialSpawn={{ x: spawnData.x, y: spawnData.y }}
            initialUsers={spawnData.users}
            avatarMap={avatarMap}
            onAvatarNeeded={handleAvatarNeeded}
        />
    )
}