# Local Development Guide

## Prerequisites

- **Node.js** >= 18 (tested with v24.11.0)
- **npm** >= 9 (tested with v11.12.0)
- **Docker** (required for Keycloak, optional for other services)

## Quick Start

### Terminal 1: Keycloak (Identity Provider)

```bash
docker run -d --name keycloak -p 8080:8080 ^
  -e KEYCLOAK_ADMIN=admin ^
  -e KEYCLOAK_ADMIN_PASSWORD=admin ^
  -v "%CD%\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" ^
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

Wait ~30 seconds for Keycloak to start. Verify: open http://localhost:8080/admin and log in with admin/admin.

On Mac/Linux:
```bash
docker run -d --name keycloak -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -v "$(pwd)/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json" \
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

### Terminal 2: Frontend

```bash
cd services/frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

Open http://localhost:3000 in your browser. You should see the landing page with "Sign In" and "Create Account" buttons.

### Terminal 3: Health Monitor

```bash
cd scripts
npm install
```

On Windows (PowerShell):
```powershell
$env:AUTH_HEALTH_URL="http://localhost:8080/health/ready"
$env:LIVEOPS_EVENTS_URL="http://localhost:4000/api/events"
npx tsx health-monitor.ts
```

On Mac/Linux:
```bash
AUTH_HEALTH_URL=http://localhost:8080/health/ready LIVEOPS_EVENTS_URL=http://localhost:4000/api/events npx tsx health-monitor.ts
```

> **Note**: The LiveOps backend (port 4000) doesn't exist yet. The health monitor will log errors when trying to push events, which is expected. It will still poll Keycloak's health endpoint and log status changes.

## Testing the OAuth Flow

1. Open http://localhost:3000
2. Click **"Sign In"** — redirects to Keycloak login page
3. Log in with **demo / demo** (pre-configured demo user)
4. Keycloak redirects back to http://localhost:3000/dashboard#access_token=...&token_type=bearer&expires_in=3600
5. The dashboard page extracts the token and shows your user info

## Testing Registration

1. Open http://localhost:3000
2. Click **"Create Account"** — redirects to Keycloak registration page
3. Fill in the registration form
4. After registration, Keycloak redirects back to the dashboard

## Testing the Health Monitor

The health monitor polls Keycloak's `/health/ready` endpoint every 5 seconds. To simulate an outage:

1. Stop Keycloak: `docker stop keycloak`
2. Watch the health monitor console — after 3 consecutive failures (15 seconds), it will log `Keycloak is down!` and attempt to push an incident event to LiveOps
3. Restart Keycloak: `docker start keycloak`
4. After 3 consecutive successes, it will log `Keycloak recovered!` and push a recovery event

## Accessing Keycloak Admin Console

- **URL**: http://localhost:8080/admin
- **Username**: admin
- **Password**: admin
- **Realm**: myawesomeapp
- **Client ID**: myawesomeapp-frontend

From here you can manage users, roles, and client settings.

## API Endpoints

### Keycloak (port 8080)

| Endpoint | Description |
|---|---|
| `/realms/myawesomeapp/protocol/openid-connect/auth` | OAuth2 authorization endpoint (login) |
| `/realms/myawesomeapp/protocol/openid-connect/registrations` | User registration endpoint |
| `/realms/myawesomeapp/protocol/openid-connect/userinfo` | User info from token |
| `/health/ready` | Health check endpoint |
| `/admin` | Admin console |

### Frontend (port 3000)

| Route | Description |
|---|---|
| `/` | Landing page with Sign In and Create Account buttons |
| `/dashboard` | Logged-in dashboard with Keycloak status and kill button |

## Kill Keycloak Button

The "Kill Keycloak" button on the dashboard sends a POST request to `http://localhost:4000/api/kill-auth`. This requires the LiveOps backend to be running, which isn't part of this repo. When the LiveOps backend is running, this endpoint deletes the Keycloak pod in Kubernetes.

For local testing without Kubernetes, you can manually stop the Keycloak container: `docker stop keycloak`

## Environment Variables

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak URL |
| `NEXT_PUBLIC_KEYCLOAK_REALM` | `myawesomeapp` | Keycloak realm name |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | `myawesomeapp-frontend` | OAuth2 client ID |
| `NEXT_PUBLIC_REDIRECT_URI` | `http://localhost:3000/dashboard` | OAuth2 redirect URI |
| `NEXT_PUBLIC_FRONTEND_URL` | `http://localhost:3000` | Frontend URL (for logout redirect) |
| `NEXT_PUBLIC_LIVEOPS_URL` | `http://localhost:4000` | LiveOps backend URL |

### Health Monitor

| Variable | Default | Description |
|---|---|---|
| `AUTH_HEALTH_URL` | `http://keycloak:8080/health/ready` | Keycloak health endpoint |
| `LIVEOPS_EVENTS_URL` | `http://liveops-backend:4000/api/events` | LiveOps SSE events endpoint |

## Docker Build (Optional)

```bash
# Frontend
cd services/frontend
docker build -t demo-frontend:local .

# Health monitor
cd scripts
docker build -t health-monitor:local .

# Keycloak (custom image with realm)
cd keycloak
docker build -t keycloak-myawesomeapp:local .
```

## Stopping Services

```bash
# Stop Keycloak
docker stop keycloak
docker rm keycloak

# Stop frontend and health monitor (Ctrl+C in their terminals)
# Or run stop.bat on Windows
```

## Troubleshooting

### "Cannot connect to Keycloak"
- Make sure Keycloak is running: `docker ps | grep keycloak`
- Check http://localhost:8080/health/ready responds with `{"status": "UP"}`
- Keycloak takes ~30 seconds to start up

### "Cannot connect to frontend"
- Make sure the frontend dev server is running on port 3000
- Check `http://localhost:3000` returns HTML

### "404 on page reload or static chunks"
- Delete the `.next` cache: `Remove-Item -Recurse -Force services/frontend/.next` (PowerShell)
- Restart the frontend dev server
- This happens occasionally when the Next.js dev cache gets corrupted

### OAuth redirect not working
- Keycloak must be running on port 8080 before clicking "Sign In" or "Create Account"
- The redirect URI must match what Keycloak expects (http://localhost:3000/dashboard*)
- If you see a "Invalid redirect uri" error in Keycloak, check the client's valid redirect URIs in the admin console

### Health monitor errors about LiveOps
- This is expected — the LiveOps backend doesn't exist yet
- The health monitor will still poll Keycloak and log status changes to console