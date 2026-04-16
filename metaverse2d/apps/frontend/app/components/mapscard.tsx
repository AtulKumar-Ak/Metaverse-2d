//apps/frontend/app/components/mapscard.tsx
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface Map {
  mapId: string;
  name: string;
  thumbnail: string;
  dimensions: string;
}

export default function MapCard() {
  const [maps, setMaps] = useState<Map[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/signup');

    axios.get('http://localhost:3000/api/v1/admin/maps', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => {
      setMaps(res.data.maps || []);
    })
    .catch(() => {

    });
  }, [router]);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Maps</h2>
      <div>
        {maps.map((map) => (
          <div key={map.mapId} className="flex items-center space-x-4">
            <img src={map.thumbnail} alt={map.name} className="w-16 h-16 rounded object-cover" />
            <div>
              <div className="font-semibold">{map.name}</div>
              <div className="text-sm text-gray-600">Size: {map.dimensions}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
