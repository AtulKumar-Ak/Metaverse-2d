import { Router } from "express";
import { AddElementSchema, CreateSpaceSchema, DeleteElementSchema } from "../../types";
import client from '@repo/db/client'
import { userMiddleware } from "../../middlewares/user";
import { adminMiddleware } from "../../middlewares/admin";
export const spaceRouter =Router();
spaceRouter.use(userMiddleware)

spaceRouter.post('/element',async(req,res)=>{
    const parseData=AddElementSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({error:"error"})
        return
    } 
    try{
        const response=await client.space.findUnique({
            where:{
                id:parseData.data.spaceId
            },select:{
                creatorId:true,
                height:true,
                width:true
            }
        })
        if(!response || response.creatorId!==req.userId){
            res.status(400).json({error:"you cant"})
            return
        }
        if(parseData.data.x>response.width || parseData.data.y>response.height || parseData.data.x<0 || parseData.data.y<0){
            res.status(403).json({
                message:"not permitted outside boundary"
            })
            return;
        }
        const element=await client.spaceElements.create({
            data:{
                spaceId:parseData.data.spaceId,
                elementId:parseData.data.elementId,
                x:parseData.data.x,
                y:parseData.data.y
            }
        })
        res.status(200).json({
            message:"element created",
        })
        return
    }catch{
        res.status(500).json({error:"error"})
        return
    }
})
spaceRouter.delete('/element',async(req,res)=>{
    const pareseData=DeleteElementSchema.safeParse(req.body)
    if(!pareseData.success){
        res.status(400).json({error:"error"})
        return
    } 
    const response=await client.spaceElements.findUnique({
        where:{
            id:pareseData.data.id
        },include:{
            space:true
        }
    })
    if(!response || response.space.creatorId!==req.userId){
        res.status(404).json({error:"you can't delete this"})
        return
    }
    await client.spaceElements.delete({
        where:{
            id:pareseData.data.id
        }
    })
    res.status(200).json({
        message:"element deleted"
    })
    return
        
})
spaceRouter.get('/elements',async(req,res)=>{
    try{
        const response=await client.element.findMany()
        if(!response){
            res.status(400).json({error:"elements not found"})
            return
        }
        res.status(200).json({
            elements:response.map(x=>({
                id:x.id,
                height:x.height,
                width:x.width,
                imageUrl:x.imageUrl,
                static:x.static
            }))
        })
        return
    }catch{
        res.status(500).json({
            message:"internal server error"
        })
        return
    }
})
spaceRouter.post('/',async(req,res)=>{
    const parseData=CreateSpaceSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({message:"Validation failed"})
        return
    }
    try{
        if(!parseData.data.mapId){
            console.log("yaha aa gaya")
            const response=await client.space.create({
                data:{
                    name: parseData.data.name,
                    width: parseInt(parseData.data.dimensions.split("x")[0]),
                    height: parseInt(parseData.data.dimensions.split("x")[1]),
                    creatorId: req.userId as string
                }
            })
            console.log("yaha pe bhi aa gaya")
            res.status(200).json({
                spaceId:response.id
            })
            return
        }
        const mapp=await client.map.findUnique({
            where:{
                id:parseData.data.mapId
            },select:{
                width:true,
                height:true,
                mapElements:true
            }
        })
        if(!mapp){
            res.status(400).json({
                message:"Map not found"
            })
            return
        }
        let space=await client.$transaction(async()=>{
            const space=await client.space.create({
                data:{
                    name: parseData.data.name,
                    width: parseInt(parseData.data.dimensions.split("x")[0]),
                    height: parseInt(parseData.data.dimensions.split("x")[1]),
                    creatorId: req.userId as string
                }
            })
            await client.spaceElements.createMany({
                data:mapp.mapElements.map(e=>({
                    spaceId:space.id,
                    elementId:e.elementId,
                    x:e.x??0,
                    y:e.y??0
                }))
            })
            return space
        })
        res.status(200).json({
            spaceId:space.id
        })
        return
        
    }catch(e){
        res.status(500).json({
            message:"internal server error"
        })
        return
    }
})


spaceRouter.get('/all',async(req,res)=>{
    try{
        console.log("Fetching spaces for", req.userId);
        const spaces = await client.space.findMany({
        where: {
            creatorId: req.userId!
        }
        })
    console.log("Fetching spaces for", req.userId);
    res.json({
        spaces: spaces.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail,
            dimensions: `${s.width}x${s.height}`,
        }))
    })
    return

    }catch(e){
        res.status(500).json({
            message:"Error fetching spaces"
        })
        return
    }
})

spaceRouter.get('/:spaceId',async(req,res)=>{
    const space = await client.space.findUnique({
        where: {
            id: req.params.spaceId
        },
        include: {
            elements: {
                include: {
                    element: true
                }
            },
        }
    })

    if (!space) {
        res.status(400).json({message: "Space not found"})
        return
    }
    res.status(200).json({
        dimensions:`${space.width}x${space.height}`,
        elements:space.elements.map(x=>({
            id:x.id,
            element:{
                id:x.element.id,
                imageUrl:x.element.imageUrl,
                height:x.element.height,
                width:x.element.width
            },
            x:x.x,
            y:x.y
        }))
    })
})

spaceRouter.delete('/:spaceId',async(req,res)=>{
    const spaceId=req.params.spaceId
    console.log(spaceId)
    const response=await client.space.findUnique({
        where:{
            id:spaceId,
        },select:{
            creatorId:true
        }
    })
    console.log(response?.creatorId)
    if(!response){
        res.status(400).json({
            message:"Space not found"
        })
        return
    }
    if(response.creatorId!=req.userId){
        res.status(403).json({
            message:"You don't have permission to delete this space"
        })
        return
    }
    await client.space.delete({
        where:{
            id:spaceId
        }
    })
    res.status(200).json({
        message:"space deleted"
    })
    return

})
