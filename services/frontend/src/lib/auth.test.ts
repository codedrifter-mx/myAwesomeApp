import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTokenFromHash,
  storeToken,
  getStoredToken,
  clearToken,
  fetchUserInfo,
  getAdminToken,
  updateUserProfile,
} from './auth';

describe('getTokenFromHash', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hash: '' },
      writable: true,
    });
  });

  it('returns null when there is no access_token in hash', () => {
    window.location.hash = '';
    expect(getTokenFromHash()).toBeNull();
  });

  it('extracts access_token from URL hash', () => {
    window.location.hash = '#access_token=abc123&token_type=bearer&expires_in=3600';
    expect(getTokenFromHash()).toBe('abc123');
  });

  it('returns null when hash has no access_token parameter', () => {
    window.location.hash = '#token_type=bearer&expires_in=3600';
    expect(getTokenFromHash()).toBeNull();
  });
});

describe('token storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves a token', () => {
    storeToken('my-token');
    expect(getStoredToken()).toBe('my-token');
  });

  it('returns null when no token is stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('clears a stored token', () => {
    storeToken('my-token');
    clearToken();
    expect(getStoredToken()).toBeNull();
  });
});

describe('fetchUserInfo', () => {
  it('returns null when fetch fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await fetchUserInfo('bad-token');
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('returns null when response is not ok', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await fetchUserInfo('bad-token');
    expect(result).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('returns UserInfo when response is ok', async () => {
    const originalFetch = globalThis.fetch;
    const mockData = {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferred_username: 'testuser',
      realm_roles: ['default-roles-myawesomeapp'],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    const result = await fetchUserInfo('valid-token');
    expect(result).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferred_username: 'testuser',
      realm_roles: ['default-roles-myawesomeapp'],
    });
    globalThis.fetch = originalFetch;
  });
});

describe('getAdminToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await getAdminToken();
    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await getAdminToken();
    expect(result).toBeNull();
  });

  it('returns token when response is ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'admin-token-123' }),
    });
    const result = await getAdminToken();
    expect(result).toBe('admin-token-123');
  });
});

describe('updateUserProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
    const result = await updateUserProfile('token', 'user-1', { firstName: 'Test' });
    expect(result).toBe(false);
  });

  it('returns false when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await updateUserProfile('token', 'user-1', { firstName: 'Test' });
    expect(result).toBe(false);
  });

  it('returns true when response is ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const result = await updateUserProfile('token', 'user-1', { firstName: 'Test' });
    expect(result).toBe(true);
  });
});
