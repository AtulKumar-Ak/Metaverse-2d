//apps/http/src/middlewares/admin.ts
import { Request,Response,NextFunction } from "express"
import { JWT_PASSWORD } from "../config";
import jwt from 'jsonwebtoken'

//extending the req object globally as req object does not has userId and role in it
//int types.ts

export const adminMiddleware=(req:Request,res:Response,next:NextFunction)=>{
    const header=req.headers.authorization?.toString()

    const token=header?.split(" ")[1];
    if(!token){
        res.status(403).json({message:"Unauthorized"})
        return
    }
    try{
        const decodedToken=jwt.verify(token,JWT_PASSWORD) as {role:string,userId:string};
        if(decodedToken.role!=="Admin"){
            res.status(403).json({message:"Unauthorized"})
            return
        }
        req.userId=decodedToken.userId;
        next();

    }catch(e){
        res.status(401).json({message:"Unauthorized"})
        return
    }

}