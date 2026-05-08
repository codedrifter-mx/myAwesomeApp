# Infrastructure Setup — Railway (PaaS)

**Date**: 2026-05-08 (updated from 2026-05-07)
**Hackathon**: Generative UI Global Hackathon: Agentic Interfaces, May 9th 2026

## Overview

Both the Demo App and LiveOps Dashboard deploy on Railway (Platform-as-a-Service). Railway provides push-to-deploy from GitHub, a Public GraphQL API for service management (the "kill/restart" demo mechanism), and eliminates the need for k3s, ArgoCD, or server provisioning.

> **Previous approach**: Oracle Cloud k3s + ArgoCD. Replaced with Railway for simplicity. The original doc is preserved in git history.

## Railway Free Tier

- 30-day free trial with $5 credits, then $1/month
- Up to 1 vCPU / 0.5 GB RAM per service
- 0.5 GB volume storage per service
- No credit card required
- Community support

## Railway Projects

### Project 1: myAwesomeApp

| Service | Source | Port | RAM | Notes |
|---------|--------|------|-----|-------|
| keycloak | Docker image (ghcr.io) or GitHub repo | 8080 | 512MB | JVM tuned: `-Xms256m -Xmx384m` |
| demo-frontend | GitHub (codedrifter-mx/myAwesomeApp) | 3000 | 256MB | Next.js standalone |

### Project 2: liveops-dashboard

| Service | Source | Port | RAM | Notes |
|---------|--------|------|-----|-------|
| liveops-backend | GitHub (codedrifter-mx/liveops-dashboard) | 4000 | 256MB | Express + health poller + agent |
| liveops-frontend | GitHub (codedrifter-mx/liveops-dashboard) | 80 | 256MB | React + Vite |

## Detailed setup instructions

See `docs/specs/2026-05-08-railway-setup.md` in the liveops-dashboard repo for step-by-step Railway setup including:
- Account creation
- Service deployment
- Environment variable configuration
- Railway API token creation
- Keycloak realm redirect URI updates
- Service networking
- Testing the demo flow

## "Kill Keycloak" Demo Flow (Railway)

1. All 4 services running on Railway
2. Stop Keycloak via Railway dashboard or `deploymentStop` API mutation
3. LiveOps backend health poller detects outage after 3 consecutive failures (15 seconds)
4. Backend creates incident event, broadcasts via SSE to frontend
5. CopilotKit agent activates, generates incident dashboard via A2UI
6. Twilio phone call alerts owner with TTS message
7. Human approves remediation in LiveOps dashboard
8. Agent calls `serviceInstanceRedeploy` via Railway API to restart Keycloak
9. Health poller detects recovery after 3 consecutive successes
10. Dashboard shows "All Systems Operational"

## Keycloak on Railway

### JVM Memory Tuning

Keycloak must be tuned to fit Railway's 0.5 GB RAM limit. Set these environment variables:

```
JAVA_OPTS=-Xms256m -Xmx384m
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
KC_HOSTNAME_STRICT=false
KC_HTTP_ENABLED=true
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

### Realm Auto-Import

The custom Keycloak Docker image includes `realm-export.json` (with the demo user, client config, and redirect URIs). On Railway restart, Keycloak re-imports the realm, restoring all configuration. No persistent volume needed.

### Updating Redirect URIs

After deploying to Railway, update `keycloak/realm-export.json` to add Railway URLs:
- Add `https://<demo-frontend-url>/dashboard*` to `redirectUris`
- Add `https://<demo-frontend-url>/*` to `redirectUris`
- Add `https://<demo-frontend-url>` to `webOrigins`
- Add `https://<demo-frontend-url>/*` to `post.logout.redirect.uris`

Push the changes to trigger a Keycloak image rebuild.

## Monitoring

- Railway dashboard shows service status, logs, and metrics for each service
- LiveOps backend health poller checks Keycloak every 5 seconds
- SSE events stream to LiveOps frontend for real-time status updates

## Estimated Costs

| Service | Cost/day | Notes |
|---------|----------|-------|
| Keycloak | ~$0.30 | JVM, most expensive |
| demo-frontend | ~$0.15 | Next.js standalone |
| liveops-backend | ~$0.15 | Express + poller |
| liveops-frontend | ~$0.10 | Static SPA |
| **Total/day** | **~$0.70** | Within $5 free trial |

## Setup Checklist (Pre-Hackathon)

- [ ] Railway account created (free tier, no credit card)
- [ ] myAwesomeApp project created with keycloak + demo-frontend services
- [ ] Keycloak running at public URL with realm imported
- [ ] demo-frontend running and authenticating via Keycloak
- [ ] liveops-dashboard project created with backend + frontend services
- [ ] Railway API token created (project-scoped for myAwesomeApp)
- [ ] All environment variables configured
- [ ] Verified: can stop Keycloak via Railway API or dashboard
- [ ] Verified: can restart Keycloak via Railway API or dashboard
- [ ] Verified: health poller detects Keycloak down within 15 seconds
- [ ] Verified: health poller detects Keycloak recovery within 15 seconds
- [ ] Twilio account created with phone number

## Twilio Setup

1. Sign up at https://www.twilio.com
2. Purchase a phone number capable of calling Mexico (~$1/month)
3. Get Account SID, Auth Token, and Phone Number
4. Set as environment variables in liveops-backend service on Railway:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `OWNER_PHONE_NUMBER`

## What Changed from Oracle Cloud/k3s

| Before | After |
|--------|-------|
| Oracle Cloud ARM instance (4 vCPU, 24GB RAM) | Railway PaaS (4 services × 0.5GB) |
| k3s cluster setup | Push-to-deploy from GitHub |
| ArgoCD for GitOps | Railway auto-deploys on push to main |
| `kubectl delete pod` to kill Keycloak | Railway API `deploymentStop` mutation |
| kubectl/ArgoCD MCP tools for remediation | Railway API MCP tools (restart, status, logs) |
| Sidecar health-monitor container | Health polling built into LiveOps backend |
| k8s manifests in repo | Not needed (Railway manages deployment) |
| GitHub Actions builds Docker images to ghcr.io | Railway builds from repo directly |
| Traefik Ingress | Railway provides domain names and routing |