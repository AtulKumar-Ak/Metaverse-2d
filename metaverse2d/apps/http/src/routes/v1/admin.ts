//apps/http/src/routes/v1/admin.ts
import { Router } from "express";
import { adminMiddleware } from "../../middlewares/admin";
import  client from "@repo/db/client";
import { safeParse } from "zod/v4-mini";
import { CreateElementSchema, CreateAvatarSchema, CreateMapSchema, UpdateElementSchema } from "../../types";
export const adminRouter =Router();
adminRouter.use(adminMiddleware)
adminRouter.post('/element',async(req,res)=>{
    const parseData=CreateElementSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({
            message:"Invalid data"
        })
        return
    }
    const response=await client.element.create({
        data:{
            imageUrl:parseData.data.imageUrl,
            width:parseData.data.width,
            height:parseData.data.height,
            static:true

        }
    })
    res.status(200).json({
        elementId:response.id
    })
    return

})

adminRouter.put('/element/:elementId',async(req,res)=>{
    const elmentId=req.params.elementId;
    const parseData=UpdateElementSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({
            message:"validation failed"
        })
        return
    }
    const response=await client.element.findUnique({
        where:{
            id:elmentId
        }
    })
    if(!response){
        res.status(400).json({
            message:"element not found"
        })
        return
    }
    client.element.update({
        where:{
            id:elmentId
        },data:{
            imageUrl:parseData.data.imageUrl
        }
    })
    res.status(200).json({
        message:"element updated"
    })
    return
    
})

adminRouter.post('/avatar',async(req,res)=>{
    const parseData=CreateAvatarSchema.safeParse(req.body);
    if(!parseData.success){
        res.status(400).json({
            message:"Validation failed"
        })
        return
    }
    try{
        const response=await client.avatar.create({
            data:{
                name:parseData.data.name,
                imageUrl:parseData.data.imageUrl
            }
        })
        res.status(200).json({
            avatarId:response.id
        })
        return;
    }catch(e){
        console.log("return from catch")
        res.status(400).json({
            message:"error"
        })
        return
    }
})
adminRouter.post('/map',async(req,res)=>{
    const parseData=CreateMapSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({
            message:"Validation failed"
        })
        return
    }
    try{
        const response=await client.map.create({
            data:{
                thumbnail:parseData.data.thumbnail,
                name:parseData.data.name,
                width: parseInt(parseData.data.dimensions.split("x")[0]),
                height: parseInt(parseData.data.dimensions.split("x")[1]),
                mapElements: {
                create: parseData.data.defaultElements.map(e => ({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y
                }))
                }

            }
        })
        res.status(200).json({
            mapId:response.id
        })
        return
    }catch(e){
        res.status(500).json({
            message:"Error creating map"
        })
    }
})