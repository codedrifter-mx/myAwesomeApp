export interface IncidentEvent {
  type: 'incident';
  service: string;
  status: 'down';
  errorRate: string;
  impactedUsers: number;
  timestamp: string;
  lastHealthy: string;
}

export interface RecoveryEvent {
  type: 'recovery';
  service: string;
  status: 'healthy';
  timestamp: string;
}

export type HealthEvent = IncidentEvent | RecoveryEvent;

export function validateIncidentEvent(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'incident') errors.push('type must be "incident"');
  if (typeof obj.service !== 'string' || obj.service.length === 0) errors.push('service must be a non-empty string');
  if (obj.status !== 'down') errors.push('status must be "down" for incident events');
  if (typeof obj.errorRate !== 'string') errors.push('errorRate must be a string');
  if (typeof obj.impactedUsers !== 'number' || obj.impactedUsers < 0) errors.push('impactedUsers must be a non-negative number');
  if (typeof obj.timestamp !== 'string') errors.push('timestamp must be an ISO string');
  if (typeof obj.lastHealthy !== 'string') errors.push('lastHealthy must be an ISO string');

  return { valid: errors.length === 0, errors };
}

export function validateRecoveryEvent(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.type !== 'recovery') errors.push('type must be "recovery"');
  if (typeof obj.service !== 'string' || obj.service.length === 0) errors.push('service must be a non-empty string');
  if (obj.status !== 'healthy') errors.push('status must be "healthy" for recovery events');
  if (typeof obj.timestamp !== 'string') errors.push('timestamp must be an ISO string');

  return { valid: errors.length === 0, errors };
}

export function validateHealthEvent(data: unknown): { valid: boolean; errors: string[] } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Event must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (obj.type === 'incident') return validateIncidentEvent(data);
  if (obj.type === 'recovery') return validateRecoveryEvent(data);
  return { valid: false, errors: [`Unknown event type: ${obj.type}`] };
}
