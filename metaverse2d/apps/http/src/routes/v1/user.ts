//apps/http/src/routes/v1/user.ts
import { Router } from "express";
import { UpdateMetaDataSchema } from "../../types";
import  client from "@repo/db/client"
import { userMiddleware } from "../../middlewares/user";
export const userRouter =Router();
userRouter.use(userMiddleware);
userRouter.post('/metadata',async(req,res)=>{
    const parseData=UpdateMetaDataSchema.safeParse(req.body)
    if(!parseData.success){
        res.status(400).json({message:"invalid validation"})
        return
    }
    try{
        const checkid=await client.avatar.findUnique({where:{id:req.body.avatarId}})
        if(!checkid){
            res.status(400).json({message:"avatar not found"})
            return
        }
        await client.user.update({
            where:{
                id:req.userId
            },
            data:{
                avatarId:parseData.data.avatarId
            }
        
        })
        res.status(200).json({
            message:"metadata updated"
        })
        return
    }catch(e){
        res.status(400)
        return
    }


})

userRouter.get('/metadata/bulk',async(req,res)=>{
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = (userIdString).slice(1, userIdString?.length - 1).split(",");
    console.log(userIds);
    console.log(typeof(userIds))
    try{
        const response=await client.user.findMany({
            where:{
                id:{
                    in:userIds
                }
            },select:{
                avatar:true,
                id:true
            }
        })
        res.status(200).json({
            avatars:response.map(x=>({
                userId:x.id,
                avatarId:x.avatar?.imageUrl
            })),

        })
        return;

    }catch(e){
        res.status(400).json({message:"error"})
        return
    }
   
})

userRouter.get('/me', async (req, res) => {
  try {
    const user = await client.user.findUnique({
      where: { id: req.userId },
      include: { avatar: true }
    });
    if (!user) { res.status(404).json({ message: "Not found" }); return; }
    res.json({
      userId: user.id,
      username: user.username,
      avatarId: user.avatarId,
      avatarUrl: user.avatar?.imageUrl ?? null,
      avatarName: user.avatar?.name ?? null,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});