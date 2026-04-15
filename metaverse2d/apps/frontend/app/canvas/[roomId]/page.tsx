//frontend/app/canvas/[roomId]/page.tsx

import { RoomCanvas } from "@/app/components/Roomcanvas";

export default async function CanvasPage({ params }: { params: Promise<{ roomId: string }> }) {
    
    // 2. Await the params to get the actual roomId
    const { roomId } = await params;

    return (
        <>
            <RoomCanvas roomId={roomId} />
        </>
    );
}


