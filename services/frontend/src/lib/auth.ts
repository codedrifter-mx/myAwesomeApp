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

export async function getAdminToken(): Promise<string | null> {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  try {
    const res = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        username: 'admin',
        password: 'admin',
        grant_type: 'password',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  adminToken: string,
  userId: string,
  updates: { firstName?: string; lastName?: string; email?: string }
): Promise<boolean> {
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myawesomeapp';
  try {
    const res = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch {
    return false;
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
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'myawesomeapp-frontend';
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: frontendUrl,
  });
  return `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}