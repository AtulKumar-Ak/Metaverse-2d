import { Router } from "express";
import express from "express";
import bcrypt from "bcrypt";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { spaceRouter } from "./space";
import { SigninSchema, SignupSchema } from "../../types";
import client from '@repo/db/client';
import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from "../../config";
import { userMiddleware } from "../../middlewares/user";
export const router =Router();
router.use(express.json())
router.post('/signup',async(req,res)=>{
    const parseData=SignupSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({
            message:"validation failed"
        })
        return; 
    }
    try{
        const hashedPassword=await bcrypt.hash(req.body.password,10)
        const user=await client.user.create({
           data:{ 
            username:parseData.data.username,
            password:hashedPassword,
            role:parseData.data.type==="admin"?"Admin":"User"}
        })
        res.json({
            userId:user.id
        })
        return
    }catch(e){
        res.status(400).json({
            message:"User Already Exists"
        })
        return
    }
})
router.post('/signin',async(req,res)=>{
    const parseData=SigninSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(403).json({
            message:"Validation Failed"
        })
        return
    }
    try{
        const user=await client.user.findUnique({where:{username:req.body.username}})
        if(!user){
            res.status(403).json({
                message:"User Not Found" 
            })
            return
        }
        const checkPass=await bcrypt.compare(req.body.password,user.password)  
        if(!checkPass){
            res.status(403).json({
                message:"Invalid Password"
            })
            return
        }      
        const token=jwt.sign({userId:user.id,role:user.role},JWT_PASSWORD)
        res.json({
            token
        })
        return

    }catch(e){
        res.status(500).json({
            message:"internal server error"
        })
        return
    }
})
router.get("/elements",userMiddleware,(req,res)=>{
})

router.get("/avatars",userMiddleware,async(req,res)=>{
    try{
        const avatars=await client.avatar.findMany({
            select:{
                id:true,
                name:true,
                imageUrl:true
            }
        })
        res.status(200).json({
            avatars
        })
        return
    }catch(e){
        res.status(500).json({
            message:"Internal Server Error"
        })
        return
    }
})

router.use("/user",userRouter);
router.use("/space",spaceRouter);
router.use("/admin",adminRouter);
