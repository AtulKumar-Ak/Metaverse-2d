import type { User } from "./User";
import {OutgoingMessage} from './types'
export class RoomManager{
    rooms:Map<string,User[]>=new Map();
    static instance : RoomManager;
    private constructor(){
        this.rooms=new Map()
    }
    static getInstance(){
        if(!this.instance)
            this.instance=new RoomManager();
        return this.instance
    }
    public removeUser(user:User,spaceId:string){
        if(!this.rooms.has(spaceId)) return;
        this.rooms.set(spaceId,(this.rooms.get(spaceId)?.filter((u) => u.id !== user.id) ?? []))

    }
    public addUser(user:User,spaceId:string){
        if(!this.rooms.has(spaceId)){
            this.rooms.set(spaceId,[user]);
            return
        }
        this.rooms.set(spaceId, [...(this.rooms.get(spaceId) ?? []), user]);

    }
    public broadCastMessage(message:OutgoingMessage,user:User,roomId:string){
        if(!this.rooms.has(roomId)) return;
        this.rooms.get(roomId)?.map((x)=>{
            if(x.id !== user.id){
                x.send(message);
            }
        })
    }
}