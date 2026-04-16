//apps/http/src/index.ts
import express from 'express'
import { router } from './routes/v1';
import cors from 'cors';
const app=express();
app.use(cors())
app.use(express.json())
app.use("/api/v1",router)
app.listen(process.env.NEXT_PUBLIC_HTTP_PORT || 3000)
