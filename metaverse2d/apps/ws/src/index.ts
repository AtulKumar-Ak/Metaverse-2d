//apps/ws/src/index.ts
import { WebSocketServer } from 'ws';
import { User } from './User';

const wss = new WebSocketServer({ port: Number(process.env.PORT || 3001) });

wss.on('connection', function connection(ws) {
    let user=new User(ws)
    ws.on('error', console.error);
    ws.on('close',()=>{
        user.destroy()
    })

});