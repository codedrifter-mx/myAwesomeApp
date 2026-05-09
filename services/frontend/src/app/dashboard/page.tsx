'use client';

import { useEffect, useState } from 'react';
import {
  getStoredToken, getTokenFromHash, storeToken, fetchUserInfo,
  clearToken, getKeycloakLogoutUrl, getAdminToken, updateUserProfile,
  type UserInfo
} from '@/lib/auth';

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let token = getStoredToken();
    if (!token) {
      token = getTokenFromHash();
      if (token) { storeToken(token); window.location.hash = ''; }
      else { window.location.href = '/'; return; }
    }
    fetchUserInfo(token).then((u) => {
      if (!u) { clearToken(); return; }
      setUser(u);
      const parts = u.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(u.email);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveStatus('');
    const adminToken = await getAdminToken();
    if (!adminToken) { setSaveStatus('Failed to authenticate as admin'); setSaving(false); return; }
    const ok = await updateUserProfile(adminToken, user.sub, { firstName, lastName, email });
    setSaveStatus(ok ? 'Profile updated!' : 'Update failed');
    if (ok) setUser({ ...user, name: `${firstName} ${lastName}`, email });
    setSaving(false);
  };

  const handleLogout = async () => {
    clearToken();
    try {
      await fetch(getKeycloakLogoutUrl(), { credentials: 'include' });
    } catch {}
    window.location.href = '/';
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout_state') === 'done') {
      sessionStorage.removeItem('access_token');
      window.location.href = '/';
    }
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .dash {
          min-height: 100vh;
          background: #0a0a0a;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui, sans-serif;
        }

        .dash-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .dash-header h1 { font-size: 20px; font-weight: 500; letter-spacing: -0.03em; }
        .dash-header .user-badge {
          display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(255,255,255,0.7);
        }
        .dash-header .user-badge .avatar {
          width: 32px; height: 32px; border-radius: 50%; background: #38b2ac;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: #fff;
        }
        .btn-signout {
          padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
          background: transparent; color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer; transition: 0.15s;
        }
        .btn-signout:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .dash-body { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .stat-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 20px;
        }
        .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
        .stat-value { font-size: 28px; font-weight: 600; letter-spacing: -0.03em; }
        .stat-change { font-size: 12px; color: #48bb78; margin-top: 4px; }
        .stat-change.down { color: #f56565; }

        /* Charts */
        .chart-section { margin-bottom: 40px; }
        .chart-section h3 { font-size: 16px; font-weight: 500; letter-spacing: -0.02em; margin-bottom: 16px; color: rgba(255,255,255,0.8); }
        .chart-area {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 24px; display: flex; align-items: flex-end; gap: 8px; height: 180px;
        }
        .chart-bar {
          flex: 1; border-radius: 4px 4px 0 0; min-height: 8px;
          background: linear-gradient(to top, #38b2ac, #805ad5); opacity: 0.7; transition: opacity 0.2s;
        }
        .chart-bar:hover { opacity: 1; }

        /* Profile */
        .profile-section {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 28px;
        }
        .profile-section h3 { font-size: 16px; font-weight: 500; letter-spacing: -0.02em; margin-bottom: 20px; color: rgba(255,255,255,0.8); }
        .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .profile-grid { grid-template-columns: 1fr; } }
        .field label { display: block; font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .field input {
          width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05); color: #fff; font-size: 14px; outline: none; transition: 0.15s;
        }
        .field input:focus { border-color: #38b2ac; box-shadow: 0 0 0 3px rgba(56,178,172,0.15); }
        .field input:disabled { opacity: 0.4; }
        .save-row { display: flex; align-items: center; gap: 16px; margin-top: 20px; }
        .btn-save {
          padding: 10px 24px; border-radius: 8px; border: none; background: #38b2ac;
          color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; transition: 0.15s;
        }
        .btn-save:hover { background: #2d9a94; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-status { font-size: 13px; }
        .save-status.ok { color: #48bb78; }
        .save-status.err { color: #f56565; }
      `}</style>

      <div className="dash">
        <header className="dash-header">
          <h1>myAwesomeApp</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <div className="user-badge">
                <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span>{user.name}</span>
              </div>
            )}
            <button className="btn-signout" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        <div className="dash-body">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Subscribers</div>
              <div className="stat-value">2,847</div>
              <div className="stat-change">+12% this month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">MRR</div>
              <div className="stat-value">$89.4k</div>
              <div className="stat-change">+8.2% this month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Churn Rate</div>
              <div className="stat-value">3.2%</div>
              <div className="stat-change down">+0.4% this month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Plans</div>
              <div className="stat-value">6</div>
              <div className="stat-change">3 new this quarter</div>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-section">
            <h3>Revenue (last 12 months)</h3>
            <div className="chart-area">
              {[40, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 95].map((h, i) => (
                <div key={i} className="chart-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="profile-section">
            <h3>Profile Settings</h3>
            <div className="profile-grid">
              <div className="field">
                <label>First Name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="save-row">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveStatus && <span className={`save-status ${saveStatus === 'Profile updated!' ? 'ok' : 'err'}`}>{saveStatus}</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
