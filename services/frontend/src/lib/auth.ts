export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function getTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export async function fetchUserInfo(token: string, authUrl?: string): Promise<UserInfo | null> {
  const baseUrl = authUrl || process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${baseUrl}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.location.hash = '';
  sessionStorage.removeItem('access_token');
}

export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('access_token', token);
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('access_token');
}