//ws/src/RoomManager.ts
import type { User } from "./User";
import {OutgoingMessage} from './types'
import client from '@repo/db/client'

type SpaceCache = {
    width: number;
    height: number;
    blocked: Set<string>;
    loadedAt: number;
}

export class RoomManager{
    rooms:Map<string,User[]>=new Map();
    private spaceCache: Map<string, SpaceCache> = new Map();
    static instance : RoomManager;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private constructor(){
        this.rooms=new Map()
    }
    static getInstance(){
        if(!this.instance)
            this.instance=new RoomManager();
        return this.instance
    }

    // Ensure space metadata and blocked tiles are loaded into memory
    async ensureSpaceLoaded(spaceId: string) {
        const cached = this.spaceCache.get(spaceId);
        if (cached && (Date.now() - cached.loadedAt) < this.CACHE_TTL_MS) return;

        const space = await client.space.findUnique({
            where: { id: spaceId },
            include: { elements: { include: { element: true } } }
        });
        if (!space) return;

        const blocked = new Set<string>();
        space.elements.forEach((e: any) => {
            if (e.element?.static) blocked.add(`${e.x},${e.y}`);
        });

        this.spaceCache.set(spaceId, {
            width: space.width,
            height: space.height,
            blocked,
            loadedAt: Date.now()
        });
    }

    // Force refresh of cached space data
    async refreshSpace(spaceId: string) {
        this.spaceCache.delete(spaceId);
        await this.ensureSpaceLoaded(spaceId);
    }

    isBlocked(spaceId: string, x: number, y: number) {
        const c = this.spaceCache.get(spaceId);
        if (!c) return false;
        return c.blocked.has(`${x},${y}`);
    }

    getDimensions(spaceId: string) {
        const c = this.spaceCache.get(spaceId);
        if (!c) return null;
        return { width: c.width, height: c.height };
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
    public sendMessageToUser(toUserId: string, message: any) {
        // We iterate through all rooms to find the user with the matching ID
        this.rooms.forEach((users) => {
            const recipient = users.find(u => u.userId === toUserId);
            if (recipient) {
                recipient.send(message);
            }
        });
    }
}