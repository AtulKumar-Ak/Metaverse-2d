//frontend/app/components/canvas.tsx

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { isNear, getProximityVolume, Player } from "./SpatialManger";
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
}
const imageCache: Record<string, HTMLImageElement> = {};
export function Canvas(props: CanvasProps) {
  const userIdRef = useRef<string>(props.initialUserId); 
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [userId, setUserId] = useState<string>(props.initialUserId);
  const [canvasSize, setCanvasSize] = useState({ width: props.width, height: props.height });
  const { initiateCall, disconnectFrom, setUserVolume, handleSignaling, peerConnections } = useWebRTC(props.socket, userId);
  
  const tileSize = 50;
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
    
  const activeId = userIdRef.current;
  const current = players[activeId];
  if (!activeId || !current) return;

  const newX = current.x + dx;
  const newY = current.y + dy;
  const updatedMe: Player = { userId: activeId, x: newX, y: newY };

  setPlayers((prev) => ({ ...prev, [activeId]: updatedMe }));
  props.sendMessage({ type: "move", payload: { x: newX, y: newY, userId: activeId } });

  // Proximity voice chat
  Object.values(players).forEach((otherPlayer) => {
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
  }, [move]);

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
    ctx.strokeStyle = "#cbd5e1";
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
    ctx.strokeStyle = "#ef4444"; // Red border for world limits
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
        img.src = url;
        img.onload = () => {
            imageCache[url] = img;
            // This force-triggers the useEffect to run again once the image is ready
            setImagesLoaded(prev => prev + 1);
        };
        return; 
    }
    ctx.drawImage(imageCache[url], x, y, tileSize, tileSize);
};

// 3. Update the loop that draws elements
props.elements?.forEach((e: any) => {
    const ex = e.x * tileSize - camX;
    const ey = e.y * tileSize - camY;

    // Based on your Prisma include: include: { element: true }
    // The imageUrl is inside e.element.imageUrl
    const imageUrl = e.element?.imageUrl;

    if (imageUrl) {
        drawImage(imageUrl, ex, ey);
    } else {
        // Fallback color so you can at least see where the objects are
        ctx.fillStyle = e.element?.static ? "#334155" : "#94a3b8"; 
        ctx.fillRect(ex, ey, tileSize, tileSize);
    }
});
    // Draw other players
    others.forEach((p) => {
      const px = p.x * tileSize - camX + tileSize / 2;
      const py = p.y * tileSize - camY + tileSize / 2;
      
      // Only draw if within canvas bounds (with some margin)
      if (px > -50 && px < canvas.width + 50 && py > -50 && py < canvas.height + 50) {
        ctx.beginPath();
        ctx.fillStyle = "#f87171";
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw user ID
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        if (p.userId) {
            ctx.fillText(p.userId.slice(0, 3), px, py + 35);
        }
      }
    });

    // Draw current user
    if (currentUser) {
  const px = currentUser.x * tileSize - camX;
  const py = currentUser.y * tileSize - camY;
  
  // Draw player body
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(px + 5, py + 5, tileSize - 10, tileSize - 10); // Centered square
  
  // Draw "You" tag
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("YOU", px + tileSize/2, py - 5);
}
  },[players, canvasSize, props.elements, imagesLoaded]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-100">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0 cursor-crosshair"
        tabIndex={0}
      />
      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
        Use WASD or Arrow keys to move
      </div>
    </div>
  );
}