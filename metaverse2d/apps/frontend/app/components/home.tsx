'use client';
import AvatarCard from './Avatarscard';

export default function HomeDashboard() {
  return (
    <main className="space-y-6 max-w-screen-lg mx-auto" >
      <h1 className="text-3xl font-bold text-center mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AvatarCard />
      </div>
    </main>
  );
}
