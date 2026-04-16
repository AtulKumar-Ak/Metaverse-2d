//apps/frontend/app/components/authpage.tsx
"use client"
import axios from 'axios'
import { useRef } from "react"


export function AuthPage({signIn}:{
    signIn:boolean
}){
    
    const nameRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLInputElement>(null);
    const passRef = useRef<HTMLInputElement>(null);
    async function submitHandler(){
        const username=nameRef.current?.value||""
        const type=typeRef.current?.value||""
        const password=passRef.current?.value||""
        const payload=signIn?{username,password}:{username,type,password}
        const authapi=signIn?"http://localhost:3000/api/v1/signin":"http://localhost:3000/api/v1/signup"
        try{
            const res=await axios.post(authapi,payload)
            localStorage.setItem("token", res.data.token);
        }
        catch(e){
            console.log(e)
            alert("something went wrong")
        }
    }

    return (
        <div className="h-screen w-screen flex justify-center items-center">
            <div className="p-2 m-2 rounded-2xl bg-gray-600">
                <div>
                    <h1 className="text-2xl font-bold text-center">{signIn?"Sign In":"Sign Up"}</h1>
                </div>
                <div>
                    <input ref={nameRef} type="text" placeholder="username" className="p-1"/>
                </div>
                <div>
                    <input ref={typeRef} type="text" placeholder="type" className="p-1" />
                </div>
                <div>
                    <input ref={passRef} type="password" placeholder="password" className="p-1"/>
                </div>
                <div className="flex justify-center items-center">
                    <button className="hover:bg-sky-700 p-2 rounded-3xl" onClick={submitHandler}>Submit</button>
                </div>
            </div>
        </div>
    )
}