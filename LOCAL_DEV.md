# Local Development Guide

## Prerequisites

- **Node.js** >= 18 (tested with v24.11.0)
- **npm** >= 9 (tested with v11.12.0)
- **Docker** (optional, for containerized builds)

## Quick Start

### Terminal 1: Auth Service

```bash
cd services/auth
npm install
npm run dev
```

Runs on `http://localhost:3001`

Verify it's up:
```bash
curl http://localhost:3001/health
# {"status":"ok","uptime":5,"service":"auth-microservice","timestamp":"..."}
```

### Terminal 2: Frontend

```bash
cd services/frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

Open http://localhost:3000 in your browser. You should see the landing page with "Sign In with OAuth".

### Terminal 3: Health Monitor

```bash
cd scripts
npm install
AUTH_HEALTH_URL=http://localhost:3001/health LIVEOPS_EVENTS_URL=http://localhost:4000/api/events npx tsx health-monitor.ts
```

> **Note**: The LiveOps backend (port 4000) doesn't exist yet. The health monitor will log errors when trying to push events, which is expected. It will still poll the auth service health endpoint and log status changes.

On Windows (PowerShell):
```powershell
cd scripts
npm install
$env:AUTH_HEALTH_URL="http://localhost:3001/health"
$env:LIVEOPS_EVENTS_URL="http://localhost:4000/api/events"
npx tsx health-monitor.ts
```

## Testing the OAuth Flow

1. Open http://localhost:3000
2. Click "Sign In with OAuth"
3. You'll be redirected to the auth service's `/authorize` endpoint, which redirects back to `http://localhost:3000/dashboard#access_token=...&token_type=bearer&expires_in=3600&state=random-state`
4. The dashboard page extracts the token and shows your user info

## Testing the Health Monitor

The health monitor polls `http://localhost:3001/health` every 5 seconds. To simulate an outage:

1. Stop the auth service (Ctrl+C in Terminal 1)
2. Watch the health monitor console — after 3 consecutive failures (15 seconds), it will log `Auth service is down!` and attempt to push an incident event to LiveOps
3. Restart the auth service — after 3 consecutive successes, it will log `Auth service recovered!` and push a recovery event

## API Endpoints

### Auth Service (port 3001)

| Endpoint | Method | Description |
|---|---|---|
| `/authorize?redirect_uri=<url>&state=<state>` | GET | OAuth2 implicit flow — redirects with token in URL fragment |
| `/token` | POST | Returns error (implicit flow doesn't use token endpoint) |
| `/userinfo` | GET | Returns user info from JWT (requires `Authorization: Bearer <token>`) |
| `/health` | GET | Returns service health status |

### Frontend (port 3000)

| Route | Description |
|---|---|
| `/` | Landing page with OAuth login link |
| `/login` | OAuth callback handler (extracts token from URL fragment) |
| `/dashboard` | Logged-in dashboard with service status and kill button |

## Kill Auth Service Button

The "Kill Auth Service" button on the dashboard sends a POST request to `http://localhost:4000/api/kill-auth`. This requires the LiveOps backend to be running, which isn't part of this repo. When the LiveOps backend is running, this endpoint deletes the auth service pod in Kubernetes.

For local testing without Kubernetes, you can manually stop the auth service process to simulate the same effect.

## Environment Variables

### Auth Service

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `hackathon-demo-secret-change-in-prod` | Secret for signing JWT tokens |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_AUTH_URL` | `http://localhost:3001` | Auth service URL |
| `NEXT_PUBLIC_LIVEOPS_URL` | `http://localhost:4000` | LiveOps backend URL |

### Health Monitor

| Variable | Default | Description |
|---|---|---|
| `AUTH_HEALTH_URL` | `http://auth-service:3001/health` | Auth service health endpoint |
| `LIVEOPS_EVENTS_URL` | `http://liveops-backend:4000/api/events` | LiveOps SSE events endpoint |

## Docker Build (Optional)

```bash
# Auth service
cd services/auth
docker build -t auth-service:local .

# Frontend
cd services/frontend
docker build -t demo-frontend:local .

# Health monitor
cd scripts
docker build -t health-monitor:local .
```

## Troubleshooting

### "Cannot connect to auth service"
- Make sure the auth service is running on port 3001
- Check `http://localhost:3001/health` responds with `{"status":"ok",...}`

### "Cannot connect to frontend"
- Make sure the frontend dev server is running on port 3000
- Check `http://localhost:3000` returns HTML

### OAuth redirect not working
- The auth service must be running on port 3001 before clicking "Sign In"
- The redirect URI must match what the frontend expects (`http://localhost:3000/dashboard`)

### Health monitor errors about LiveOps
- This is expected — the LiveOps backend doesn't exist yet
- The health monitor will still poll the auth service and log status changes to console