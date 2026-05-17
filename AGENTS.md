# myAwesomeApp — Agent Instructions

## Project Overview

Demo application for the Generative UI Global Hackathon. A Next.js frontend with Keycloak auth, deployed on k3s with ArgoCD. The health-monitor sidecar watches Keycloak and pushes SSE events to LiveOps.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, no CSS framework (inline styles)
- **Auth**: Keycloak 26.0 with OAuth2 implicit flow
- **Health Monitor**: TypeScript script using `tsx` runner
- **Infrastructure**: k3s, ArgoCD, Traefik ingress, GitHub Actions CI/CD
- **Container Registry**: ghcr.io/codedrifter-mx/myawesomeapp

## Architecture

```
services/frontend/   → Next.js app (port 3000) — landing page + dashboard
keycloak/            → Keycloak realm config + Dockerfile
scripts/             → health-monitor.ts (polls Keycloak, pushes events to LiveOps)
k8s/                 → Kubernetes manifests for ArgoCD deployment
.github/workflows/   → CI/CD pipelines (build Docker images on push to main)
```

## Key Conventions

- TypeScript strict mode is enabled (`"strict": true` in tsconfig.json)
- No CSS framework — all styles are inline `<style>` blocks in components
- Environment variables use `NEXT_PUBLIC_` prefix for client-side access
- Keycloak URL/realm/client are configured via env vars with local defaults
- The auth service directory (`services/auth/`) is currently empty — auth is handled entirely by Keycloak

## Commands

### Frontend
```bash
cd services/frontend
npm install
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript type check (tsc --noEmit)
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright browser tests
```

### Health Monitor
```bash
cd scripts
npm install
AUTH_HEALTH_URL=http://localhost:8080/health/ready \
  LIVEOPS_EVENTS_URL=http://localhost:4000/api/events \
  npx tsx health-monitor.ts
```

### Keycloak (local dev)
```bash
docker run -d --name keycloak -p 8080:8080 ^
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin ^
  -v "%CD%\keycloak\realm-export.json:/opt/keycloak/data/import/realm-export.json" ^
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

## Deployment

- Push to `main` → GitHub Actions builds Docker images → pushes to ghcr.io → ArgoCD auto-deploys
- Kubernetes namespace: `demo-app`
- Secrets are managed with sealed-secrets (see `k8s/sealed-secrets/README.md`)

## Testing

- Unit tests: Vitest (`services/frontend/src/**/*.test.ts`, `scripts/**/*.test.ts`)
- Browser tests: Playwright (E2E flows — login, dashboard)
- Always run `npm run lint && npm run typecheck && npm run test` before committing
