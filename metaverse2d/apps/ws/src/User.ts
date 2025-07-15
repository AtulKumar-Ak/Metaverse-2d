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
                    const x=parsedData.payload.x
                    const y=parsedData.payload.y
                    const xDisplacement=Math.abs(this.x-x)
                    const yDisplacement=Math.abs(this.y-y)
                    console.log(xDisplacement,yDisplacement)
                    if((xDisplacement===1 && yDisplacement===0) || (xDisplacement===0 && yDisplacement===1) || (xDisplacement===0 && yDisplacement===-1) || (xDisplacement===-1 && yDisplacement===0)){
                        this.x=x;
                        this.y=y;
                        RoomManager.getInstance().broadCastMessage({
                            type:"movement",
                            payload: {
                                 userId: this.userId,
                                  x: this.x,
                                 y: this.y
                            }

                        },this,this.spaceId!)
                        return
                    }
                    this.send({
                        type:"movement-rejected",
                        payload:{
                            x:this.x,
                            y:this.y
                        }
                    })
                    
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