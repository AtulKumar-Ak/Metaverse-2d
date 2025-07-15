"use client"
import { useEffect, useRef, useState } from "react"
import {Canvas} from './canvas'
import { useRouter } from "next/navigation"
export function RoomCanvas({roomId}:{
    roomId:string
}){
    const router=useRouter()
    const [socket,setSocket]=useState<WebSocket|null>(null)
    const socketRef=useRef<WebSocket|null>(null)
    const [connection,setConnection]=useState<boolean>(false)
    useEffect(()=>{
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please sign in first");
            router.push("/signup");
            return;
        }
        const ws =new WebSocket(`ws://localhost:3001?token=${token}&roomId=${roomId}`)
        socketRef.current=ws
        ws.onopen=()=>{
            ws.send(JSON.stringify({
               type: "join",
               payload: {
                 spaceId: roomId,
                 token,
               },
             }))
            setConnection(true)
            setSocket(ws)

        }
        // ws.onmessage=(event)=>{
        //     const message=event.data
        //     console.log("Received message",message)
        //     setMessages((prev) => [...prev, message]);
        // }
        ws.onerror=(err)=>{
            console.log("Error",err);
        }
        ws.onclose=()=>{
            console.log("socket closed")
        }

        return ()=>{
            ws.close()
            setConnection(false)
        }

    },[roomId, router])
    const sendMessage = (data: object) => {
    const json = JSON.stringify(data);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(json);
    } else {
      console.warn("Socket not ready");
    }
    };
    if(!socket || !connection){
        return <div>
            connecting to server...
        </div>
    }
    return(
        <>
            <Canvas roomId={roomId} socket={socket} sendMessage={sendMessage} messages={[]} />

        </>
    )
}