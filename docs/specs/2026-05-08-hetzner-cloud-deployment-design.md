# Hetzner Cloud Production Deployment — Design Spec

**Date**: 2026-05-08
**Provider**: Hetzner Cloud (CX32, 4 vCPU, 8GB RAM, x86)
**Domain**: User-owned domain with any DNS provider

## Overview

Deploy the myAwesomeApp demo (Frontend + Keycloak + Health Monitor) to a production-grade site on Hetzner Cloud. Single CX32 x86 instance running k3s with ArgoCD for GitOps deployment. Self-signed TLS certificate for HTTPS (upgradeable to Let's Encrypt later).

## Architecture

```
Internet → Hetzner Cloud Firewall → CX32 Instance (4 vCPU, 8GB RAM)
  └── k3s single-node cluster
       ├── Traefik Ingress (self-signed TLS termination)
       │    ├── app.<domain>    → demo-frontend:3000
       │    ├── auth.<domain>   → keycloak:8080
       │    └── argocd.<domain>  → argocd-server:80
       ├── ArgoCD (GitOps controller)
       ├── Keycloak (production mode, PostgreSQL persistence)
       └── demo-frontend + health-monitor sidecar
```

## Hetzner Cloud Setup

### Instance
- **Plan**: CX32 (4 vCPU, 8GB RAM, x86) — €6.99/mo
- **Image**: Ubuntu 24.04
- **Storage**: 80GB NVMe SSD (included)
- **Public IP**: Assigned automatically
- **Location**: Nuremberg (EU-NBG1-DC1) or Helsinki (EU-HEL1-DC1)

### Firewall
- Create a Hetzner Firewall via the web console called `hackathon-fw`
- Ingress rules:
  - Port 22 (SSH) — source: 0.0.0.0/0
  - Port 80 (HTTP) — source: 0.0.0.0/0
  - Port 443 (HTTPS) — source: 0.0.0.0/0
  - Port 6443 (k8s API) — source: your IP (optional, for remote kubectl)
- Apply the firewall to the instance

### DNS
- Use any DNS provider (Cloudflare, Namecheap, Google Domains, etc.)
- A records:
  - `app.<domain>` → instance public IP
  - `auth.<domain>` → instance public IP
  - `argocd.<domain>` → instance public IP

## k3s Cluster

- Installed via `curl -sfL https://get.k3s.io | sh -`
- `--tls-san` includes public IP and domain names
- Built-in Traefik handles ingress routing
- Self-signed TLS secret stored in Kubernetes for ingress termination

## ArgoCD

- Installed via standard manifests
- Exposed at `argocd.<domain>` via Traefik ingress
- Connected to `https://github.com/codedrifter-mx/myAwesomeApp.git`
- Auto-sync enabled, polls every 3 minutes
- Initial admin password from Kubernetes secret

## Keycloak (Production Mode)

- **Mode**: `start` (production, not `start-dev`)
- **Proxy mode**: `KC_PROXY=edge` (trusts Traefik ingress headers)
- **Hostname**: `auth.<domain>` via `KC_HOSTNAME` env var
- **TLS**: Terminated at Traefik ingress (self-signed cert), HTTP internally
- **Database**: PostgreSQL via k3s hostPath PersistentVolume
- **Realm**: Pre-configured via ConfigMap volume mount with `--import-realm`
- **Resources**: 250m CPU / 512Mi RAM requests, 500m CPU / 1Gi RAM limits

## Frontend + Health Monitor

- **Frontend**: Next.js standalone build on port 3000
- **Environment variables**:
  - `NEXT_PUBLIC_KEYCLOAK_URL`: `https://auth.<domain>` (public URL for browser redirects)
  - `NEXT_PUBLIC_KEYCLOAK_REALM`: `myawesomeapp`
  - `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`: `myawesomeapp-frontend`
  - `NEXT_PUBLIC_REDIRECT_URI`: `https://app.<domain>/dashboard`
  - `NEXT_PUBLIC_FRONTEND_URL`: `https://app.<domain>`
  - `NEXT_PUBLIC_LIVEOPS_URL`: `http://liveops-backend:4000` (internal, when available)
- **Health Monitor sidecar**: Polls `http://keycloak:8080/health/ready` internally
- **Ingress**: `app.<domain>` → port 3000

## TLS Strategy

- Self-signed certificate generated on the instance via `openssl`
- Stored as Kubernetes TLS secret in `demo-app` namespace
- Traefik ingress references this secret for TLS termination
- All HTTP traffic redirected to HTTPS via Traefik middleware
- Browsers will show security warnings — acceptable for demo/hackathon
- Upgrade path: Replace self-signed cert with Let's Encrypt via cert-manager

## CI/CD Pipeline

- GitHub Actions (already configured) builds Docker images on push to `main`
- Images pushed to `ghcr.io/codedrifter-mx/myawesomeapp/*`
- ArgoCD watches the repo and auto-deploys
- Image update strategy: Use `:latest` tag with `imagePullPolicy: Always` for simplicity

## Resource Estimates

| Component | CPU Request | RAM Request | CPU Limit | RAM Limit |
|-----------|-------------|-------------|-----------|-----------|
| k3s system | 500m | 1GB | — | — |
| ArgoCD | 500m | 1.5GB | 1 | 2GB |
| Keycloak | 250m | 512Mi | 500m | 1Gi |
| PostgreSQL | 250m | 256Mi | 500m | 512Mi |
| Frontend | 100m | 128Mi | 250m | 256Mi |
| Health Monitor | 50m | 64Mi | 100m | 128Mi |
| **Total** | **1.65** | **3.46GB** | **2.35** | **~4GB** |
| **Available** | **4** | **8GB** | | |

Plenty of headroom for all services with room to spare.

## Files to Create/Modify

### New Files
- `k8s/postgresql-pvc.yaml` — PersistentVolumeClaim for PostgreSQL data
- `k8s/postgresql-deployment.yaml` — PostgreSQL deployment for Keycloak
- `k8s/postgresql-service.yaml` — PostgreSQL service
- `k8s/traefik-middleware.yaml` — HTTP→HTTPS redirect middleware
- `scripts/setup-hetzner-cloud.sh` — One-shot server provisioning script
- `.github/workflows/argocd-sync.yml` — GitHub Action to trigger ArgoCD sync

### Modified Files
- `k8s/keycloak-deployment.yaml` — Switch to production mode, add PostgreSQL config, add proxy/hostname env vars
- `k8s/keycloak-ingress.yaml` — Add TLS, add hostname-based routing
- `k8s/keycloak-configmap.yaml` — Update redirect URIs for production domain
- `k8s/demo-frontend-deployment.yaml` — Update env vars for production URLs
- `k8s/demo-frontend-ingress.yaml` — Add TLS, add hostname-based routing
- `k8s/secrets.yaml` — Add PostgreSQL credentials
- `keycloak/realm-export.json` — Update redirect URIs for production domain

## Keycloak Production Mode Considerations

1. **Must set** `KC_PROXY=edge` — tells Keycloak it's behind a reverse proxy that handles TLS
2. **Must set** `KC_HOSTNAME` to `auth.<domain>` — Keycloak validates incoming Host headers
3. **Must set** `KC_HTTP_ENABLED=true` — allows HTTP internally (Traefik handles TLS)
4. **Must use** a persistent database — `dev-mem` is for dev only, data lost on restart
5. **Must add** production domain to Keycloak client's Valid Redirect URIs and Web Origins
