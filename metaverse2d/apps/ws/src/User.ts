//ws/src/User.ts
import { WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import client from '@repo/db/client';
import { RoomManager } from "./RoomManager";
import { OutgoingMessage } from "./types";
function getRandomString(length:number){
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
export class User{
    public id:string;
    private ws:WebSocket;
    private x:number;
    private y:number;
    public userId?:string;
    private spaceId?:string;
    private lastMoveTime: number = 0;
    private readonly MOVE_COOLDOWN_MS = 120;

    constructor(ws:WebSocket){
        this.id=getRandomString(10);
        this.x=0;
        this.y=0;
        this.ws=ws
        this.initHandler()

    }
    initHandler(){
        this.ws.on('message',async(data)=>{
            const parsedData=JSON.parse(data.toString());
            switch(parsedData.type){
                case 'join':
                    const token=parsedData.payload.token;
                    if(!token){
                        this.ws.close()
                        return
                    }
                    const decodedToken=jwt.verify(token,JWT_PASSWORD) as {role:string,userId:string};
                    this.userId=decodedToken.userId
                    const space=await client.space.findFirst({
                        where:{
                            id:parsedData.payload.spaceId
                        }
                    })
                    if(!space){
                        this.ws.close()
                        return
                    }
                    this.spaceId=space.id
                    // Ensure we have the space metadata and blocked tiles cached
                    await RoomManager.getInstance().ensureSpaceLoaded(this.spaceId);
                    const dims = RoomManager.getInstance().getDimensions(this.spaceId) ?? { width: space.width, height: space.height };
                    this.x=Math.floor(dims.width/2);
                    this.y=Math.floor(dims.height/2);
                    RoomManager.getInstance().addUser(this,this.spaceId)
                    this.send({
                        type:"space-joined",
                        payload:{
                            userId: this.userId,
                            spawn:{
                                x:this.x,
                                y:this.y
                            },
                            users: RoomManager.getInstance().rooms.get(this.spaceId)?.filter(x => x.id !== this.id)?.map((u) => ({userId: u.userId, x: u.x,y: u.y,})) ?? []

                        }
                    })
                    RoomManager.getInstance().broadCastMessage({
                        type: "user-joined",
                        payload: {
                            userId: this.userId,
                            x: this.x,
                            y: this.y
                        }
                    }, this, this.spaceId!);
                    break;
                    case 'move':
                        const now = Date.now();
                        if (now - this.lastMoveTime < this.MOVE_COOLDOWN_MS) return;
                        this.lastMoveTime = now;
                        const targetX = parsedData.payload.x;
                        const targetY = parsedData.payload.y;
                        const xDisplacement = Math.abs(this.x - targetX);
                        const yDisplacement = Math.abs(this.y - targetY);

                        // 1. Check if the movement is only 1 step
                        if ((xDisplacement === 1 && yDisplacement === 0) || (xDisplacement === 0 && yDisplacement === 1)) {

                            // 2. Use cached space metadata to prevent crossing boundaries and check collisions
                            await RoomManager.getInstance().ensureSpaceLoaded(this.spaceId!);
                            const dims = RoomManager.getInstance().getDimensions(this.spaceId!);
                            if (!dims) return;

                            // Boundary Check: Ensure they stay within 0 and the max dimensions
                            if (targetX < 0 || targetX >= dims.width || targetY < 0 || targetY >= dims.height) {
                                this.send({
                                    type: "movement-rejected",
                                    payload: { x: this.x, y: this.y, userId: this.userId }
                                });
                                return;
                            }

                            // 3. Collision Check: Ensure the tile isn't occupied by a "static" element (using in-memory cache)
                            if (RoomManager.getInstance().isBlocked(this.spaceId!, targetX, targetY)) {
                                this.send({
                                    type: "movement-rejected",
                                    payload: { x: this.x, y: this.y }
                                });
                                return;
                            }
                        
                            // 4. Update position and broadcast if all checks pass
                            this.x = targetX;
                            this.y = targetY;
                            RoomManager.getInstance().broadCastMessage({
                                type: "movement",
                                payload: { userId: this.userId, x: this.x, y: this.y }
                            }, this, this.spaceId!);
                        }
                        break;
                    case 'signaling':
                        const toUserId = parsedData.payload.toUserId;
                        const signalData = parsedData.payload.signal;

                        // We take the signal (Offer/Answer/ICE) from the sender
                        // and relay it directly to the target user.
                        RoomManager.getInstance().sendMessageToUser(toUserId, {
                            type: "signaling",
                            payload: {
                                fromUserId: this.userId, // The target needs to know who is calling
                                signal: signalData
                            }
                        });
                        break;
                    
            }
        })
    }
    destroy(){
        RoomManager.getInstance().broadCastMessage({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        },this,this.spaceId!);
        RoomManager.getInstance().removeUser(this,this.spaceId!);
    }
    send(payload: OutgoingMessage) {
        this.ws.send(JSON.stringify(payload));
    }
}