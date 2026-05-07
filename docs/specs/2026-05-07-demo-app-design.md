# Demo App (Throwaway Microservices) — Design Spec

**Date**: 2026-05-07
**Repo**: `git@github.com:codedrifter-mx/myAwesomeApp.git`
**Hackathon**: Generative UI Global Hackathon: Agentic Interfaces, May 9th 2026
**Purpose**: A minimal containerized app that we intentionally break during the LiveOps demo

## Overview

The demo app is one half of the hackathon project. It consists of a Next.js frontend and an Express.js auth microservice, both deployed on k3s and managed by ArgoCD. During the demo, the auth service is intentionally killed, triggering the LiveOps dashboard's agentic response.

This app exists to be monitored and repaired — it's the "patient" that LiveOps treats.

## Architecture

```
Demo App (myAwesomeApp repo)
├── Frontend (Next.js)
│   ├── Landing page (minimal)
│   ├── OAuth2 implicit flow login
│   └── "Kill Auth Service" button (triggers pod deletion via LiveOps API)
├── Auth Microservice (Express.js)
│   ├── OAuth2 implicit flow authorization server
│   ├── /authorize, /token, /userinfo, /health endpoints
│   └── Single replica deployment (easy to kill and restart)
└── Health Monitor (sidecar)
    ├── Polls auth service /health every 5 seconds
    └── Pushes SSE event to LiveOps backend on failure detection
```

## Frontend (Next.js)

- Simple landing page with minimal UI investment
- OAuth2 implicit flow login using the auth microservice
- Logged-in state shows basic dashboard view
- "Kill Auth Service" button that sends request to LiveOps API to delete the auth pod
- Dockerfile for containerized build

## Auth Microservice (Express.js)

- OAuth2 implicit flow authorization server
- Issues JWT tokens
- Standard endpoints:
  - `GET /authorize` — authorization endpoint, redirects with token in fragment
  - `POST /token` — token endpoint (implicit flow returns token in authorize redirect)
  - `GET /userinfo` — returns user info from JWT
  - `GET /health` — returns `{ status: "ok", uptime: <seconds> }` for health monitoring
- Single replica Deployment (1 pod — makes it easy to kill and demonstrates single point of failure)
- Dockerfile for containerized build

## Health Monitor (sidecar)

- Runs as a sidecar container in the same pod as the frontend
- Polls `http://auth-service:3001/health` every 5 seconds
- On 3 consecutive failures (15 seconds), pushes SSE event to LiveOps backend:
  ```json
  {
    "type": "incident",
    "service": "auth-microservice",
    "status": "down",
    "errorRate": "100%",
    "impactedUsers": 15,
    "timestamp": "2026-05-09T18:30:00Z",
    "lastHealthy": "2026-05-09T18:29:45Z"
  }
  ```
- When service recovers (3 consecutive successes), pushes resolution event:
  ```json
  {
    "type": "recovery",
    "service": "auth-microservice",
    "status": "healthy",
    "timestamp": "2026-05-09T18:35:00Z"
  }
  ```
- SSE target: `http://liveops-backend:4000/api/events`

## GitHub Actions CI/CD

- **demo-frontend.yml**: Build Next.js Docker image → push to `ghcr.io/codedrifter-mx/myawesomeapp/demo-frontend`
- **auth-service.yml**: Build Express.js Docker image → push to `ghcr.io/codedrifter-mx/myawesomeapp/auth-service`
- Both trigger on push to `main`
- ArgoCD watches the repo and auto-deploys new images

## Kubernetes Manifests (ArgoCD)

- Namespace: `demo-app`
- Deployments: `demo-frontend` (1 replica), `auth-service` (1 replica)
- Services: `demo-frontend` (port 80), `auth-service` (port 3001)
- Ingress: Traefik ingress routes for the frontend and auth service
- Health monitor runs as sidecar in `demo-frontend` pod

## Directory Structure

```
myAwesomeApp/
├── .github/
│   └── workflows/
│       ├── demo-frontend.yml
│       └── auth-service.yml
├── k8s/
│   ├── namespace.yaml
│   ├── demo-frontend-deployment.yaml
│   ├── demo-frontend-service.yaml
│   ├── demo-frontend-ingress.yaml
│   ├── auth-service-deployment.yaml
│   ├── auth-service-service.yaml
│   └── auth-service-ingress.yaml
├── services/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx          (landing page)
│   │       │   ├── login/
│   │       │   └── dashboard/
│   │       └── lib/
│   │           ├── auth.ts            (OAuth implicit flow)
│   │           └── health-monitor.ts  (sidecar SSE push)
│   └── auth/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── routes/
│           │   ├── authorize.ts
│           │   ├── token.ts
│           │   ├── userinfo.ts
│           │   └── health.ts
│           └── middleware/
│               └── jwt.ts
├── docs/
│   └── specs/
│       └── 2026-05-07-demo-app-design.md
└── README.md
```