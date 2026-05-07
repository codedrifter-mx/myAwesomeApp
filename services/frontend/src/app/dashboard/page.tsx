'use client';

import { useEffect, useState } from 'react';
import { getStoredToken, fetchUserInfo, clearToken, type UserInfo } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [killStatus, setKillStatus] = useState<string>('');
  const [authHealthy, setAuthHealthy] = useState<boolean>(true);

  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
  const liveopsUrl = process.env.NEXT_PUBLIC_LIVEOPS_URL || 'http://localhost:4000';

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetchUserInfo(token, authUrl).then((u) => {
      if (u) setUser(u);
      else clearToken();
    });
  }, [authUrl]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${authUrl}/health`);
        setAuthHealthy(res.ok);
      } catch {
        setAuthHealthy(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [authUrl]);

  const handleKillAuth = async () => {
    setKillStatus('Killing auth service...');
    try {
      const res = await fetch(`${liveopsUrl}/api/kill-auth`, { method: 'POST' });
      const data = await res.json();
      setKillStatus(data.message || 'Auth service kill signal sent');
    } catch {
      setKillStatus('Failed to reach LiveOps backend. Is it running?');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <button
          onClick={() => { clearToken(); window.location.href = '/'; }}
          style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      {user && (
        <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Welcome, {user.name}</h2>
          <p style={{ color: '#888', margin: 0 }}>{user.email} &middot; {user.role}</p>
        </div>
      )}

      <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>Service Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: '12px', height: '12px', borderRadius: '50%',
            background: authHealthy ? '#48bb78' : '#f56565',
            display: 'inline-block',
          }} />
          <span>Auth Microservice — {authHealthy ? 'Healthy' : 'Down'}</span>
        </div>
      </div>

      <div style={{ background: '#2d1b1b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #f56565' }}>
        <h3 style={{ color: '#f56565', marginTop: 0 }}>Danger Zone</h3>
        <p>Click below to kill the auth service pod. This will trigger the LiveOps incident response pipeline.</p>
        <button
          onClick={handleKillAuth}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f56565',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Kill Auth Service
        </button>
        {killStatus && <p style={{ marginTop: '1rem', color: '#fc8181' }}>{killStatus}</p>}
      </div>
    </div>
  );
}