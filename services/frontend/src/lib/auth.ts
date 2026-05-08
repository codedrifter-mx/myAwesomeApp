export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  realm_roles: string[];
}

export function getTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export async function fetchUserInfo(token: string): Promise<UserInfo | null> {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  try {
    const res = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      sub: data.sub,
      email: data.email || '',
      name: data.name || data.preferred_username || '',
      preferred_username: data.preferred_username || '',
      realm_roles: data.realm_roles || [],
    };
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

export function getKeycloakLogoutUrl(): string {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  return `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent(frontendUrl)}`;
}