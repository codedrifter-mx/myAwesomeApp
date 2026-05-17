import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('checkHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when health endpoint responds ok', async () => {
    vi.resetModules();
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(true);
  });

  it('returns false when health endpoint responds with error', async () => {
    vi.resetModules();
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(false);
  });

  it('returns false when fetch throws an error', async () => {
    vi.resetModules();
    process.env.AUTH_HEALTH_URL = 'http://test:8080/health/ready';
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));
    const { checkHealth } = await import('./health-monitor');
    const result = await checkHealth();
    expect(result).toBe(false);
  });
});
