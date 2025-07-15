import { RoomCanvas } from "@/app/components/Roomcanvas";

export default function CanvasPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;
  return(
    <>
    <RoomCanvas roomId={roomId} />
    </>

  ) 
}


