//apps/frontend/app/components/Avatarscard.tsx
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Avatar {
  id: string;
  name: string;
  imageurl: string;
}

export default function AvatarCard() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [avaId,setAvaId]=useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/signup');
    axios.get('http://localhost:3000/api/v1/avatars', {
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
            'http://localhost:3000/api/v1/user/metadata',
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
          <div key={avatar.id} className="flex flex-col items-center space-y-2 p-2 rounded-xl transition-all ${
      avaId === avatar.id ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-50'
    }`}">
            <button onClick={()=>{HandleClick(avatar.id)}}>

            <img src={avatar.imageurl} alt={avatar.name} className="w-16 h-16 rounded-full object-cover shadow-sm" />
            </button>
            <span className="text-sm font-medium text-gray-700">{avatar.name}</span>
          </div>
        ))}
      </div>
      <div className='justify-center flex'>
      <button onClick={()=>{SubmitClick()}} className='bg-blue-900 rounded-xl p-2 px-4 cursor-pointer'>Submit</button>

      </div>
    </div>
  );
}
