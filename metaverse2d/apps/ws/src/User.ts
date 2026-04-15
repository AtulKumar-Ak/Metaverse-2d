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
                    RoomManager.getInstance().addUser(this,this.spaceId)
                    this.x=Math.floor(space.width/2);
                    this.y=Math.floor(space.height/2);
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
                        const targetX = parsedData.payload.x;
                        const targetY = parsedData.payload.y;
                        const xDisplacement = Math.abs(this.x - targetX);
                        const yDisplacement = Math.abs(this.y - targetY);

                        // 1. Check if the movement is only 1 step
                        if ((xDisplacement === 1 && yDisplacement === 0) || (xDisplacement === 0 && yDisplacement === 1)) {

                            // 2. Fetch the Space dimensions to prevent crossing the red boundary
                            const space = await client.space.findUnique({
                                where: { id: this.spaceId },
                                select: { width: true, height: true }
                            });
                        
                            if (!space) return;
                        
                            // Boundary Check: Ensure they stay within 0 and the max dimensions
                            if (targetX < 0 || targetX >= space.width || targetY < 0 || targetY >= space.height) {
                                this.send({
                                    type: "movement-rejected",
                                    payload: { x: this.x, y: this.y, userId: this.userId }
                                });
                                return;
                            }
                        
                            // 3. Collision Check: Ensure the tile isn't occupied by a "static" element
                            const obstacle = await client.spaceElements.findFirst({
                                where: {
                                    spaceId: this.spaceId,
                                    x: targetX,
                                    y: targetY,
                                    element: { static: true }
                                }
                            });
                        
                            if (obstacle) {
                                // If there's a wall/static element, reject the move
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