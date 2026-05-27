//apps/frontend/app/components/NotificationBell.tsx

'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const BackendAPI = process.env.NEXT_PUBLIC_HTTPBACKEND;

interface Notification {
  id: string;
  spaceId: string;
  spaceName: string;
  type: string;
  read: boolean;
  createdAt: string;
  fromUser: { username: string };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${BackendAPI}/api/v1/user/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
    } catch {}
  }

  async function markRead(id: string) {
    const token = localStorage.getItem('token');
    try {
        await axios.patch(`${BackendAPI}/api/v1/user/notifications/${id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  }

  async function acceptInvite(notification: Notification) {
    await markRead(notification.id);
    router.push(`/canvas/${notification.spaceId}`);
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center gap-2 px-4 py-2 min-w-[120px] justify-between font-mono-hud text-xs transition-all cursor-pointer"
        style={{
          color: unread > 0 ? 'var(--neon-amber)' : 'var(--text-dim)',
          border: `1px solid ${unread > 0 ? 'rgba(255,170,0,0.35)' : 'var(--border-dim)'}`,
          background: unread > 0 ? 'rgba(255,170,0,0.06)' : 'transparent',
        }}>
        INVITES
        {unread > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-[4px] text-[10px] font-bold rounded-full"
            style={{ background: 'var(--neon-amber)', color: 'var(--bg-void)', fontSize: '0.6rem' }}>
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-[5px] mt-1 z-50 font-mono-hud"
          style={{
            width: 320,
            background: 'rgba(6,12,18,0.98)',
            border: '1px solid rgba(0,245,255,0.15)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(0,245,255,0.08)' }}>
            <span className="text-xs tracking-widest" style={{ color: 'var(--text-dim)' }}>
              // NOTIFICATIONS
            </span>
            <span className="text-xs" style={{ color: 'var(--neon-amber)' }}>
              {unread} UNREAD
            </span>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--neon-cyan) transparent' }}>
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                NO NOTIFICATIONS
              </div>
            ) : notifications.map(n => (
              <div key={n.id}
                className="px-4 py-3 border-b transition-all"
                style={{
                  borderColor: 'rgba(0,245,255,0.05)',
                  background: n.read ? 'transparent' : 'rgba(255,170,0,0.04)',
                }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold" style={{ color: 'var(--neon-amber)' }}>
                      {n.fromUser.username}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {' '}invited you to join
                    </span>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--neon-cyan)' }}>
                      {n.spaceName}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: 'var(--neon-amber)' }} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptInvite(n)}
                    className="flex-1 py-1.5 text-xs font-bold tracking-widest transition-all"
                    style={{
                      background: 'rgba(0,255,136,0.15)',
                      border: '1px solid rgba(0,255,136,0.4)',
                      color: 'var(--neon-green)',
                    }}>
                    ▶ JOIN
                  </button>
                  <button
                    onClick={() => markRead(n.id)}
                    className="px-3 py-1.5 text-xs transition-all"
                    style={{
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-dim)',
                    }}>
                    DISMISS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}