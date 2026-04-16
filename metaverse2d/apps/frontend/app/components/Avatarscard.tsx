//apps/frontend/app/components/Avatarscard.tsx
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
interface Avatar {
  id: string;
  name: string;
  imageurl: string;
}
const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND
export default function AvatarCard() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avaId,setAvaId]=useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/signup');
    axios.get(`${BackendAPI}/api/v1/avatars`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => {
      setAvatars(res.data.avatars || []);
    })
    .catch(() => {
    });
  }, [router]);
  function HandleClick(avatarId:string){
    setAvaId(avatarId);
  }
  async function SubmitClick(){
    try{
        const token=localStorage.getItem('token')
        await axios.post(
            `${BackendAPI}/api/v1/user/metadata`,
            { avatarId: avaId },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          alert("Avatar updated!");
          // REDIRECT: Move them to the space creation or selection page
          router.push('/create_space');

    }catch{
      console.error(err);
      alert("select an avatar")
    }
  }
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Avatars</h2>
      <div className="grid grid-cols-2 gap-4">
  {avatars.map((avatar) => (
    <div
      key={avatar.id}
      className={`flex flex-col items-center space-y-2 p-2 rounded-xl transition-all 
        ${avaId === avatar.id 
          ? 'bg-gray-700 ring-2 ring-gray-400' 
          : 'hover:bg-gray-800'
        }`}
    >
      <button onClick={() => HandleClick(avatar.id)}>
        <Image 
          src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${avatar.name}`}
          alt={avatar.name}
          width={20}
          height={20}
          className="rounded-full object-cover shadow-sm cursor-pointer"
        />
      </button>

      <span className="text-sm font-medium text-gray-300">
        {avatar.name}
      </span>
    </div>
  ))}
</div>
      <div className='justify-center flex'>
      <button onClick={()=>{SubmitClick()}} className='bg-blue-900 rounded-xl p-2 px-4 cursor-pointer'>Submit</button>

      </div>
    </div>
  );
}
