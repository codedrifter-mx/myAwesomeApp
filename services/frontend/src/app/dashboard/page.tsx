'use client';

import { useEffect, useState } from 'react';
import { getStoredToken, getTokenFromHash, storeToken, fetchUserInfo, clearToken, getKeycloakLogoutUrl, type UserInfo } from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let token = getStoredToken();

    if (!token) {
      token = getTokenFromHash();
      if (token) {
        storeToken(token);
        window.location.hash = '';
      } else {
        window.location.href = '/';
        return;
      }
    }

    fetchUserInfo(token).then((u) => {
      if (u) setUser(u);
      else clearToken();
    });
  }, []);

  const handleLogout = () => {
    clearToken();
    window.location.href = getKeycloakLogoutUrl();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{ padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      {user && (
        <div style={{ background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Welcome, {user.name}</h2>
          <p style={{ color: '#888', margin: 0 }}>{user.email} &middot; {user.preferred_username}</p>
        </div>
      )}
    </div>
  );
}