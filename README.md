# myAwesomeApp

Demo application for the Generative UI Global Hackathon: Agentic Interfaces (May 9, 2026).

## What It Does

A Next.js frontend + Express.js auth microservice deployed on k3s with ArgoCD. During the hackathon demo, the auth service is intentionally killed, triggering the LiveOps dashboard's agentic incident response.

See [design spec](docs/specs/2026-05-07-demo-app-design.md) for full details.

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js landing page with OAuth login and dashboard |
| Auth Service | 3001 | OAuth2 implicit flow authorization server |
| Health Monitor | — | Sidecar that monitors auth service and pushes SSE events to LiveOps |

## Local Development

### Auth Service

```bash
cd services/auth
npm install
npm run dev
```

### Frontend

```bash
cd services/frontend
npm install
npm run dev
```

### Health Monitor

```bash
cd scripts
npm install
AUTH_HEALTH_URL=http://localhost:3001/health LIVEOPS_EVENTS_URL=http://localhost:4000/api/events npx tsx health-monitor.ts
```

## Deployment

Deployed via ArgoCD to k3s on Oracle Cloud. Push to `main` triggers GitHub Actions → builds Docker images → pushes to ghcr.io → ArgoCD auto-deploys.

See [infrastructure setup](docs/specs/2026-05-07-infrastructure-setup.md) for full setup instructions.