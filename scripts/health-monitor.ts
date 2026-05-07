const AUTH_HEALTH_URL = process.env.AUTH_HEALTH_URL || 'http://auth-service:3001/health';
const LIVEOPS_EVENTS_URL = process.env.LIVEOPS_EVENTS_URL || 'http://liveops-backend:4000/api/events';
const POLL_INTERVAL_MS = 5000;
const FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;
let consecutiveSuccesses = 0;
let isDown = false;
let lastHealthyTime: string | null = null;

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(AUTH_HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushEvent(event: object): Promise<void> {
  try {
    await fetch(LIVEOPS_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error('Failed to push event to LiveOps:', err);
  }
}

async function monitor(): Promise<void> {
  console.log(`Health monitor started. Polling ${AUTH_HEALTH_URL} every ${POLL_INTERVAL_MS}ms`);

  while (true) {
    const healthy = await checkHealth();

    if (healthy) {
      consecutiveFailures = 0;
      consecutiveSuccesses++;
      lastHealthyTime = new Date().toISOString();

      if (isDown && consecutiveSuccesses >= FAILURE_THRESHOLD) {
        isDown = false;
        consecutiveSuccesses = 0;
        console.log('Auth service recovered!');
        await pushEvent({
          type: 'recovery',
          service: 'auth-microservice',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      consecutiveSuccesses = 0;
      consecutiveFailures++;

      if (!isDown && consecutiveFailures >= FAILURE_THRESHOLD) {
        isDown = true;
        console.log('Auth service is down!');
        await pushEvent({
          type: 'incident',
          service: 'auth-microservice',
          status: 'down',
          errorRate: '100%',
          impactedUsers: 15,
          timestamp: new Date().toISOString(),
          lastHealthy: lastHealthyTime || new Date().toISOString(),
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

monitor().catch(console.error);