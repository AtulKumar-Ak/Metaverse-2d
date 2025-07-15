"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
}

export function Canvas(props: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [userId, setUserId] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const tileSize = 50;

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
    if (!props.socket) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      // Debug logging (remove in production)
      console.log(`Tab ${userId}: Received message:`, data);

      switch (data.type) {
        case "space-joined": {
          const { users, spawn, userId } = data.payload;
          const newPlayers: Record<string, Player> = {};

          users.forEach((element: any) => {
            newPlayers[element.userId] = {
              userId: element.userId,
              x: element.x,
              y: element.y,
            };
          });

          newPlayers[userId] = {
            userId,
            x: spawn.x,
            y: spawn.y,
          };

          setUserId(userId);
          setPlayers(newPlayers);
          break;
        }

        case "user-joined": {
          const { userId, x, y } = data.payload;
          setPlayers((prev) => ({
            ...prev,
            [userId]: { userId, x, y },
          }));
          break;
        }

        case "movement": {
          const { userId: movingUserId, x, y } = data.payload;
          // Update other players' positions (not your own since you update optimistically)
          if (movingUserId !== userId) {
            setPlayers((prev) => ({
              ...prev,
              [movingUserId]: { ...prev[movingUserId], x, y },
            }));
          }
          break;
        }

        case "movement-rejected": {
          const { x, y, userId: rejectedUserId } = data.payload;
          // Only update if this rejection is for the current user
          if (rejectedUserId === userId) {
            setPlayers((prev) => ({
              ...prev,
              [userId]: { ...prev[userId], x, y },
            }));
          }
          break;
        }

        case "user-left": {
          const { userId } = data.payload;
          setPlayers((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
          break;
        }
      }
    };

    props.socket.addEventListener("message", handleMessage);
    return () => props.socket.removeEventListener("message", handleMessage);
  }, [props.socket, userId]);

  const move = useCallback((dx: number, dy: number) => {
    const current = players[userId];
    if (!current) return;
    
    const newX = current.x + dx;
    const newY = current.y + dy;
    
    // Optimistically update local position
    setPlayers((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], x: newX, y: newY },
    }));
    
    // Send move request to server
    props.sendMessage({
      type: "move",
      payload: {
        x: newX,
        y: newY,
        userId,
      },
    });
  }, [players, userId, props.sendMessage]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentUser = players[userId];
    const others = Object.values(players).filter((p) => p.userId !== userId);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Camera position - center on current user
    const camX = (currentUser?.x ?? 0) * tileSize - canvas.width / 2;
    const camY = (currentUser?.y ?? 0) * tileSize - canvas.height / 2;

    // Draw grid
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = -camX % tileSize; x < canvas.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = -camY % tileSize; y < canvas.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

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
        ctx.fillText(p.userId.slice(0, 3), px, py + 35);
      }
    });

    // Draw current user
    if (currentUser) {
      const px = currentUser.x * tileSize - camX + tileSize / 2;
      const py = currentUser.y * tileSize - camY + tileSize / 2;
      
      ctx.beginPath();
      ctx.fillStyle = "#4ade80";
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw "You" label
      ctx.fillStyle = "#000";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("You", px, py + 35);
    }
  }, [players, userId, canvasSize]);

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