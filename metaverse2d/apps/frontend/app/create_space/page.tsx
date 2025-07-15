'use client';
import { useState,useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';


export default function CreateSpacePage() {
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState('');
  const router = useRouter();

   useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signup');
    }
  }, []);


  async function handleSubmit() {
    const token = localStorage.getItem('token');
    console.log("TOKEN" + token)
    if (!token) {
      alert("Please sign in first");
      return router.push('/signup');
    }

    try {
      const res=await axios.post(
        'http://localhost:3000/api/v1/space',
        { 
          "name":name, 
          "dimensions":dimensions },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Space created!");
      // Redirect to the new space or dashboard
      router.push(`/canvas/${res.data.spaceId}`);
    } catch (err) {
      alert(err);
      console.error(err);
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div className="p-6 bg-gray-100 rounded-xl shadow-xl w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center">Create a New Space</h1>
        <input
          type="text"
          placeholder="Space Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded-md border border-gray-300 bg-gray-500"
        />
        <input
          type="text"
          placeholder="Dimensions"
          value={dimensions}
          onChange={(e) => setDimensions(e.target.value)}
          className="w-full p-2 rounded-md border border-gray-300 bg-gray-500"
        />
        <button
          onClick={handleSubmit}
          className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Space
        </button>
      </div>
    </div>
  );
}
