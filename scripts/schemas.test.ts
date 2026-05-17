import { describe, it, expect } from 'vitest';
import {
  validateIncidentEvent,
  validateRecoveryEvent,
  validateHealthEvent,
} from './schemas';

describe('validateIncidentEvent', () => {
  const validIncident = {
    type: 'incident',
    service: 'keycloak',
    status: 'down',
    errorRate: '100%',
    impactedUsers: 15,
    timestamp: '2026-05-16T12:00:00Z',
    lastHealthy: '2026-05-16T11:59:45Z',
  };

  it('validates a correct incident event', () => {
    const result = validateIncidentEvent(validIncident);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateIncidentEvent(null);
    expect(result.valid).toBe(false);
  });

  it('rejects wrong type', () => {
    const result = validateIncidentEvent({ ...validIncident, type: 'recovery' });
    expect(result.valid).toBe(false);
  });

  it('rejects negative impactedUsers', () => {
    const result = validateIncidentEvent({ ...validIncident, impactedUsers: -1 });
    expect(result.valid).toBe(false);
  });

  it('rejects missing service', () => {
    const { service, ...rest } = validIncident;
    const result = validateIncidentEvent(rest);
    expect(result.valid).toBe(false);
  });
});

describe('validateRecoveryEvent', () => {
  const validRecovery = {
    type: 'recovery',
    service: 'keycloak',
    status: 'healthy',
    timestamp: '2026-05-16T12:05:00Z',
  };

  it('validates a correct recovery event', () => {
    const result = validateRecoveryEvent(validRecovery);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects wrong status', () => {
    const result = validateRecoveryEvent({ ...validRecovery, status: 'down' });
    expect(result.valid).toBe(false);
  });
});

describe('validateHealthEvent', () => {
  it('dispatches to incident validator for type=incident', () => {
    const result = validateHealthEvent({
      type: 'incident',
      service: 'keycloak',
      status: 'down',
      errorRate: '100%',
      impactedUsers: 15,
      timestamp: '2026-05-16T12:00:00Z',
      lastHealthy: '2026-05-16T11:59:45Z',
    });
    expect(result.valid).toBe(true);
  });

  it('dispatches to recovery validator for type=recovery', () => {
    const result = validateHealthEvent({
      type: 'recovery',
      service: 'keycloak',
      status: 'healthy',
      timestamp: '2026-05-16T12:05:00Z',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown event type', () => {
    const result = validateHealthEvent({ type: 'unknown' });
    expect(result.valid).toBe(false);
  });
});
